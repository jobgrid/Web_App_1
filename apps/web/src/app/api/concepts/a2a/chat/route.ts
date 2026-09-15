import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

type AgentKind = "a2a" | "mcp";

/** Concept demo allowlist — only public demo agents (no open SSRF). */
const ALLOWED: Record<string, { kind: AgentKind; pathPrefix?: string }> = {
  "a2a-inspector.davidcjw.com": { kind: "a2a" },
  "openagreements.org": { kind: "mcp", pathPrefix: "/api/mcp" },
};

const bodySchema = z.object({
  agentUrl: z.string().url(),
  text: z.string().min(1).max(2000),
  agentName: z.string().min(1).max(120).optional(),
});

function extractA2AReply(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const result = (root.result || root) as Record<string, unknown>;

  const artifacts = result.artifacts;
  if (Array.isArray(artifacts) && artifacts[0] && typeof artifacts[0] === "object") {
    const parts = (artifacts[0] as { parts?: unknown }).parts;
    if (Array.isArray(parts)) {
      const texts = parts
        .filter((p): p is { kind?: string; text?: string } => !!p && typeof p === "object")
        .map((p) => p.text)
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      if (texts.length) return texts.join("\n");
    }
  }

  const status = result.status as { message?: { parts?: Array<{ text?: string }> } } | undefined;
  const statusText = status?.message?.parts?.map((p) => p.text).filter(Boolean).join("\n");
  if (statusText) return statusText;

  if (typeof result.message === "string") return result.message;
  return JSON.stringify(result).slice(0, 800);
}

function extractMcpText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  if (root.error && typeof root.error === "object") {
    const err = root.error as { message?: string };
    return err.message || JSON.stringify(root.error);
  }
  const result = (root.result || root) as Record<string, unknown>;
  const content = result.content;
  if (Array.isArray(content)) {
    const parts = content
      .map((c) => (c && typeof c === "object" ? (c as { text?: string }).text : null))
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    if (parts.length) {
      // OpenAgreements returns JSON-as-text — pretty format when possible
      return parts
        .map((p) => {
          try {
            return JSON.stringify(JSON.parse(p), null, 2);
          } catch {
            return p;
          }
        })
        .join("\n\n");
    }
  }
  if (result.tools && Array.isArray(result.tools)) {
    const tools = result.tools as Array<{ name?: string; description?: string }>;
    return tools
      .map((t, i) => `${i + 1}. ${t.name}\n   ${(t.description || "").trim()}`)
      .join("\n\n");
  }
  return JSON.stringify(result).slice(0, 2000);
}

async function mcpRpc(url: string, method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "JobGrid-A2A-ChatConcept/0.2",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Agent error (${res.status})`);
  }
  return json;
}

function looksLikeSkillsQuestion(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("skill") ||
    t.includes("what can you") ||
    t.includes("capabilities") ||
    t.includes("what do you do") ||
    t.includes("help") ||
    t === "hi" ||
    t === "hello"
  );
}

function looksLikeSearch(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("search") ||
    t.includes("find") ||
    t.includes("nda") ||
    t.includes("template") ||
    t.includes("agreement") ||
    t.includes("list")
  );
}

/**
 * Concept chat proxy for allowlisted public agents (A2A message/send or MCP tools/*).
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(body.agentUrl);
  } catch {
    return NextResponse.json({ error: "Invalid agent URL" }, { status: 400 });
  }

  const allow = ALLOWED[parsed.host];
  if (!allow) {
    return NextResponse.json(
      {
        error:
          "For this concept demo, chat is allowlisted for Echo Agent (a2a-inspector) and OpenAgreements only.",
      },
      { status: 403 }
    );
  }
  if (allow.pathPrefix && !parsed.pathname.startsWith(allow.pathPrefix)) {
    return NextResponse.json({ error: "Unexpected agent path for allowlisted host" }, { status: 403 });
  }

  try {
    if (allow.kind === "a2a") {
      const rpc = {
        jsonrpc: "2.0",
        id: 1,
        method: "message/send",
        params: {
          message: {
            role: "user",
            parts: [{ kind: "text", text: body.text }],
            messageId: randomUUID(),
          },
        },
      };
      const res = await fetch(body.agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "JobGrid-A2A-ChatConcept/0.2",
        },
        body: JSON.stringify(rpc),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { error: `Agent error (${res.status})`, detail: json },
          { status: 502 }
        );
      }
      if (json.error) {
        return NextResponse.json(
          { error: json.error?.message || "Agent returned an error", detail: json.error },
          { status: 502 }
        );
      }
      return NextResponse.json({
        reply: extractA2AReply(json) || "(empty reply)",
        agentName: body.agentName || parsed.host,
        protocol: "a2a",
        raw: json,
      });
    }

    // MCP agent (OpenAgreements)
    await mcpRpc(body.agentUrl, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "jobgrid-a2a-concept", version: "0.2" },
    });

    if (looksLikeSkillsQuestion(body.text)) {
      const listed = await mcpRpc(body.agentUrl, "tools/list", {});
      const reply =
        "I am OpenAgreements — a legal agreement template agent. Here is what I can do:\n\n" +
        extractMcpText(listed);
      return NextResponse.json({
        reply,
        agentName: body.agentName || "OpenAgreements",
        protocol: "mcp",
        raw: listed,
      });
    }

    if (looksLikeSearch(body.text)) {
      // Prefer search; if user asks to list, use list_templates
      const wantList = body.text.toLowerCase().includes("list") && !body.text.toLowerCase().includes("search");
      const called = wantList
        ? await mcpRpc(body.agentUrl, "tools/call", {
            name: "list_templates",
            arguments: { limit: 8 },
          })
        : await mcpRpc(body.agentUrl, "tools/call", {
            name: "search_templates",
            arguments: { query: body.text.replace(/^(search|find)\s*(for)?\s*/i, "").trim() || body.text, limit: 5 },
          });
      return NextResponse.json({
        reply: extractMcpText(called) || "(empty reply)",
        agentName: body.agentName || "OpenAgreements",
        protocol: "mcp",
        raw: called,
      });
    }

    // Default: search with the user text as query
    const called = await mcpRpc(body.agentUrl, "tools/call", {
      name: "search_templates",
      arguments: { query: body.text, limit: 5 },
    });
    return NextResponse.json({
      reply: extractMcpText(called) || "(empty reply)",
      agentName: body.agentName || "OpenAgreements",
      protocol: "mcp",
      raw: called,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 502 }
    );
  }
}
