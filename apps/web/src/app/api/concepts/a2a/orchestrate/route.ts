import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getSeededCards } from "@/lib/a2a/crawl";
import {
  buildSteps,
  localSkillReply,
  rankAgents,
  type OrchestrateResult,
} from "@/lib/a2a/orchestrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const bodySchema = z.object({
  query: z.string().min(1).max(2000),
  /** When true, skip remote/local execution and only return ranking. */
  matchOnly: z.boolean().optional(),
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
  return JSON.stringify(result).slice(0, 2000);
}

async function mcpRpc(url: string, method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "JobGrid-A2A-Orchestrator/0.1",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Agent error (${res.status})`);
  return json;
}

async function executeWinner(
  kind: "a2a" | "mcp" | "local",
  agentUrl: string | undefined,
  agentName: string,
  query: string,
  card: Parameters<typeof localSkillReply>[0]
): Promise<{ reply: string; mode: "a2a" | "mcp" | "local" }> {
  if (kind === "local") {
    return { reply: localSkillReply(card, query), mode: "local" };
  }

  if (kind === "a2a") {
    if (!agentUrl) throw new Error("Missing A2A url");
    const rpc = {
      jsonrpc: "2.0",
      id: 1,
      method: "message/send",
      params: {
        message: {
          role: "user",
          parts: [{ kind: "text", text: query }],
          messageId: randomUUID(),
        },
      },
    };
    const res = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "JobGrid-A2A-Orchestrator/0.1",
      },
      body: JSON.stringify(rpc),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Agent error (${res.status})`);
    if (json.error) throw new Error(json.error?.message || "Agent error");
    return { reply: extractA2AReply(json) || "(empty reply)", mode: "a2a" };
  }

  // MCP (OpenAgreements)
  if (!agentUrl) throw new Error("Missing MCP url");
  await mcpRpc(agentUrl, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "jobgrid-orchestrator", version: "0.1" },
  });
  const q = query.toLowerCase();
  if (q.includes("list") && !q.includes("search") && !q.includes("find")) {
    const listed = await mcpRpc(agentUrl, "tools/call", {
      name: "list_templates",
      arguments: { limit: 8 },
    });
    return { reply: extractMcpText(listed) || "(empty)", mode: "mcp" };
  }
  const called = await mcpRpc(agentUrl, "tools/call", {
    name: "search_templates",
    arguments: { query, limit: 5 },
  });
  return {
    reply: `Routed to ${agentName} (MCP search_templates)\n\n${extractMcpText(called) || "(empty)"}`,
    mode: "mcp",
  };
}

/**
 * Google-for-agents orchestration: rank up to 50 Agent Cards, route to best suit,
 * execute when callable (remote allowlist or local concept handler).
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const catalog = getSeededCards().slice(0, 50);
  const shortlist = rankAgents(body.query, catalog, 8);
  if (!shortlist.length) {
    return NextResponse.json({ error: "No agents in catalog" }, { status: 500 });
  }

  let winner = shortlist[0];

  // If top match isn't executable, prefer a near-scoring executable from the shortlist
  if (!winner.executable) {
    const fallback = shortlist.find(
      (m) => m.executable && m.confidence >= Math.max(55, winner.confidence - 25)
    );
    if (fallback) {
      winner = {
        ...fallback,
        // keep noting original top in reasons via note later
      };
    }
  }

  const result: OrchestrateResult = {
    query: body.query,
    scanned: catalog.length,
    shortlist,
    winner,
    executed: false,
    executionMode: "none",
    reply: null,
    steps: buildSteps(catalog.length, shortlist, winner, false),
  };

  if (body.matchOnly || !winner.executable) {
    result.note = winner.executable
      ? undefined
      : "Best match is catalog-only (no public executable endpoint). Ranking still shown.";
    result.steps = buildSteps(catalog.length, shortlist, winner, false);
    return NextResponse.json(result);
  }

  try {
    const exec = await executeWinner(
      winner.executable,
      winner.agent.url,
      winner.agent.name,
      body.query,
      winner.agent
    );
    result.executed = true;
    result.executionMode = exec.mode;
    result.reply = exec.reply;
    result.steps = buildSteps(catalog.length, shortlist, winner, true);
    if (shortlist[0] && shortlist[0].agent.name !== winner.agent.name) {
      result.note = `Top conceptual match was ${shortlist[0].agent.name}; executed closest callable agent ${winner.agent.name}.`;
    }
    return NextResponse.json(result);
  } catch (e) {
    result.note = e instanceof Error ? e.message : "Execution failed";
    result.reply = localSkillReply(winner.agent, body.query);
    result.executed = true;
    result.executionMode = "local";
    result.steps = buildSteps(catalog.length, shortlist, winner, true);
    return NextResponse.json(result);
  }
}
