import { randomUUID } from "node:crypto";
import { normalizeAgentCard } from "./normalize";
import { SafeFetchError, safeFetch, safeFetchJson } from "./safe-fetch";
import type { DiscoveredAgentCard, QcCheck, QualityReport } from "./types";
import { inspectPublicHttpsUrl, looksLikeTemplateDocument } from "./url-safety";

export const LOCAL_CATALOG_AGENTS = new Set([
  "code guardian",
  "payroll copilot",
  "invoice concierge",
  "jobgrid hiring knowledge",
  "legal redline scout",
  "incident triage",
  "sql analyst",
  "agent card validator",
  "devops runbook",
  "meeting scribe",
  "research librarian",
  "crm scout",
  "email composer",
  "marketing brief agent",
  "lease sync agent",
  "onboarding buddy",
  "translation relay",
  "text toolkit (sample)",
]);

function check(
  id: string,
  label: string,
  ok: boolean,
  detail: string
): QcCheck {
  return { id, label, ok, detail };
}

function looksLikeJsonRpc(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const o = json as Record<string, unknown>;
  if (o.jsonrpc !== "2.0" && o.jsonrpc !== "2.0.0") {
    if (!("result" in o) && !("error" in o)) return false;
  }
  return "result" in o || "error" in o || o.jsonrpc === "2.0";
}

function isHtml(body: string, contentType: string) {
  if (contentType.includes("text/html")) return true;
  const head = body.slice(0, 80).toLowerCase();
  return head.includes("<!doctype") || head.includes("<html");
}

export function isLocalCatalogAgent(name?: string | null) {
  if (!name) return false;
  return LOCAL_CATALOG_AGENTS.has(name.trim().toLowerCase());
}

export function cardQualityChecks(
  card: DiscoveredAgentCard | null,
  sourceUrl: string,
  rawBody?: string
): QcCheck[] {
  const checks: QcCheck[] = [];
  const source = inspectPublicHttpsUrl(sourceUrl);
  checks.push(
    check("source_https", "Public https Agent Card URL", source.ok, source.detail)
  );

  if (rawBody && looksLikeTemplateDocument(rawBody)) {
    checks.push(
      check("not_template", "Hosted JSON (not a Jekyll/template file)", false, "Looks like a template")
    );
  } else {
    checks.push(check("not_template", "Hosted JSON (not a Jekyll/template file)", true, "JSON document"));
  }

  if (!card) {
    checks.push(check("has_name", "Card has a name", false, "Missing name — not a valid Agent Card"));
    return checks;
  }

  checks.push(
    check("has_name", "Card has a name", Boolean(card.name.trim()), card.name || "Missing name")
  );
  const hasCopy = Boolean(card.description.trim()) || card.skills.length > 0;
  checks.push(
    check(
      "has_skills_or_description",
      "Skills or description present",
      hasCopy,
      hasCopy ? `${card.skills.length} skill(s)` : "Empty card"
    )
  );

  if (!card.url) {
    checks.push(
      check(
        "endpoint_url",
        "Public https agent endpoint",
        false,
        "No url on the Agent Card"
      )
    );
  } else {
    const endpoint = inspectPublicHttpsUrl(card.url);
    checks.push(
      check("endpoint_url", "Public https agent endpoint", endpoint.ok, endpoint.detail)
    );
  }

  return checks;
}

async function probeProtocol(card: DiscoveredAgentCard): Promise<QcCheck> {
  if (!card.url) {
    return check("protocol", "Live A2A/MCP protocol ping", false, "No endpoint to probe");
  }
  const endpoint = inspectPublicHttpsUrl(card.url);
  if (!endpoint.ok) {
    return check("protocol", "Live A2A/MCP protocol ping", false, endpoint.detail);
  }

  const transport = `${card.preferredTransport || ""} ${card.url}`.toLowerCase();
  const tryMcp = transport.includes("mcp");

  const attempts: Array<{ label: string; body: unknown }> = [];
  if (tryMcp) {
    attempts.push({
      label: "MCP initialize",
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "jobgrid-qc", version: "0.1" },
        },
      },
    });
  }
  attempts.push({
    label: "A2A message/send",
    body: {
      jsonrpc: "2.0",
      id: 1,
      method: "message/send",
      params: {
        message: {
          role: "user",
          parts: [{ kind: "text", text: "JobGrid QC ping" }],
          messageId: randomUUID(),
        },
      },
    },
  });
  if (!tryMcp) {
    attempts.push({
      label: "MCP initialize",
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "jobgrid-qc", version: "0.1" },
        },
      },
    });
  }

  let lastDetail = "No protocol response";
  for (const attempt of attempts) {
    try {
      const fetched = await safeFetch(card.url, {
        method: "POST",
        timeoutMs: 8_000,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt.body),
      });
      if (isHtml(fetched.body, fetched.contentType)) {
        lastDetail = `${attempt.label}: HTML ${fetched.status}`;
        continue;
      }
      let json: unknown = null;
      try {
        json = JSON.parse(fetched.body);
      } catch {
        lastDetail = `${attempt.label}: HTTP ${fetched.status}, not JSON`;
        continue;
      }
      if (looksLikeJsonRpc(json) || fetched.status === 401 || fetched.status === 403) {
        const o = json as Record<string, unknown>;
        const err =
          o.error && typeof o.error === "object"
            ? String((o.error as { message?: string }).message || "jsonrpc error")
            : null;
        return check(
          "protocol",
          "Live A2A/MCP protocol ping",
          true,
          err
            ? `${attempt.label}: agent responded (${err})`
            : `${attempt.label}: HTTP ${fetched.status}`
        );
      }
      lastDetail = `${attempt.label}: HTTP ${fetched.status}, not JSON-RPC`;
    } catch (e) {
      lastDetail = e instanceof Error ? e.message : "Probe failed";
    }
  }
  return check("protocol", "Live A2A/MCP protocol ping", false, lastDetail);
}

export function summarizeReport(checks: QcCheck[], local: boolean): QualityReport {
  const byId = new Map(checks.map((c) => [c.id, c]));
  const listable =
    (byId.get("source_https")?.ok ?? false) &&
    (byId.get("not_template")?.ok ?? false) &&
    (byId.get("has_name")?.ok ?? false) &&
    (byId.get("has_skills_or_description")?.ok ?? false) &&
    (byId.get("endpoint_url")?.ok ?? false);
  const protocolOk = byId.get("protocol")?.ok ?? false;
  const passed = local || protocolOk;
  const grade: QualityReport["grade"] = local
    ? "local"
    : passed
      ? "pass"
      : listable
        ? "card_only"
        : "fail";
  return {
    passed,
    listable: local || listable,
    protocolOk: local || protocolOk,
    grade,
    checks,
    testedAt: new Date().toISOString(),
  };
}

export async function qualityControlFetchedCard(
  card: DiscoveredAgentCard,
  opts: { rawBody?: string; probeProtocol?: boolean } = {}
): Promise<{ report: QualityReport; card: DiscoveredAgentCard }> {
  const local = isLocalCatalogAgent(card.name);
  const checks = cardQualityChecks(card, card.sourceUrl || card.url || "", opts.rawBody);
  if (opts.probeProtocol !== false) {
    if (local && !card.url) {
      checks.push(check("protocol", "Live A2A/MCP protocol ping", true, "Local catalog handler"));
    } else {
      checks.push(await probeProtocol(card));
    }
  }
  const report = summarizeReport(checks, local);
  return { report, card: { ...card, qc: report } };
}

export async function runQualityControl(opts: {
  sourceUrl?: string;
  url?: string | null;
  name?: string;
  probeProtocol?: boolean;
}): Promise<{ report: QualityReport; card: DiscoveredAgentCard | null }> {
  const sourceUrl = opts.sourceUrl?.trim() || "";
  const local = isLocalCatalogAgent(opts.name);
  const fakeCatalogHost = sourceUrl.includes("catalog.jobgrid.ai");

  if (local && (!opts.url || fakeCatalogHost)) {
    const checks = [
      check("source_https", "Public https Agent Card URL", true, "JobGrid catalog agent"),
      check("not_template", "Hosted JSON (not a Jekyll/template file)", true, "Catalog"),
      check("has_name", "Card has a name", true, opts.name || "catalog"),
      check("has_skills_or_description", "Skills or description present", true, "Catalog"),
      check("endpoint_url", "Public https agent endpoint", true, "Local catalog handler"),
      check("protocol", "Live A2A/MCP protocol ping", true, "Local catalog handler"),
    ];
    return { report: summarizeReport(checks, true), card: null };
  }

  let rawBody = "";
  let card: DiscoveredAgentCard | null = null;

  if (sourceUrl) {
    try {
      const fetched = await safeFetchJson(sourceUrl);
      rawBody = fetched.body;
      if (fetched.json && typeof fetched.json === "object" && !Array.isArray(fetched.json)) {
        card = normalizeAgentCard(fetched.json as Record<string, unknown>, sourceUrl);
      }
    } catch (e) {
      const template = e instanceof Error && /template|Jekyll/i.test(e.message);
      const checks = cardQualityChecks(null, sourceUrl, template ? "---\npermalink: /.well-known/agent-card.json" : rawBody);
      checks.push(
        check(
          "protocol",
          "Live A2A/MCP protocol ping",
          false,
          e instanceof SafeFetchError || e instanceof Error ? e.message : "Card fetch failed"
        )
      );
      if (local) {
        checks[checks.length - 1] = check(
          "protocol",
          "Live A2A/MCP protocol ping",
          true,
          "Local catalog handler (card fetch failed; using catalog)"
        );
      }
      return { report: summarizeReport(checks, local), card: null };
    }
  }

  if (card && opts.url && !card.url) {
    card = { ...card, url: opts.url };
  } else if (!card && opts.name) {
    card = {
      name: opts.name,
      description: "",
      skills: [],
      capabilities: [],
      sourceUrl: sourceUrl || opts.url || "",
      discovery: "unknown",
      url: opts.url || "",
      status: "live",
    };
  }

  const checks = cardQualityChecks(card, sourceUrl || card?.sourceUrl || card?.url || "", rawBody);
  if (opts.probeProtocol !== false && card) {
    if (local && !card.url) {
      checks.push(check("protocol", "Live A2A/MCP protocol ping", true, "Local catalog handler"));
    } else {
      checks.push(await probeProtocol(card));
    }
  }

  const report = summarizeReport(checks, local);
  if (card) card = { ...card, qc: report };
  return { report, card };
}
