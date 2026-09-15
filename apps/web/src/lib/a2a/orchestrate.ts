import { getSeededCards } from "./crawl";
import type { DiscoveredAgentCard } from "./types";

export type MatchReason = {
  field: "name" | "description" | "skill" | "tag";
  detail: string;
  weight: number;
};

export type AgentMatch = {
  agent: DiscoveredAgentCard;
  score: number;
  confidence: number;
  matchedSkills: string[];
  reasons: MatchReason[];
  executable: "a2a" | "mcp" | "local" | null;
};

export type OrchestrateStep =
  | { id: string; label: string; status: "done" | "active" | "pending"; meta?: string }
  | { id: string; label: string; status: "done" | "active" | "pending"; meta?: string };

export type OrchestrateResult = {
  query: string;
  scanned: number;
  shortlist: AgentMatch[];
  winner: AgentMatch;
  executed: boolean;
  executionMode: "a2a" | "mcp" | "local" | "none";
  reply: string | null;
  steps: OrchestrateStep[];
  note?: string;
};

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "my",
  "our",
  "me",
  "i",
  "is",
  "are",
  "be",
  "can",
  "you",
  "please",
  "what",
  "how",
  "do",
  "does",
  "find",
  "get",
  "show",
  "help",
]);

/** Hosts we are allowed to call remotely from the concept proxy. */
export function remoteExecutable(card: DiscoveredAgentCard): "a2a" | "mcp" | null {
  if (!card.url) return null;
  try {
    const host = new URL(card.url).host;
    if (host === "a2a-inspector.davidcjw.com") return "a2a";
    if (host === "openagreements.org") return "mcp";
  } catch {
    return null;
  }
  return null;
}

/** Curated catalog agents with local concept handlers (safe demo replies). */
const LOCAL_HANDLERS = new Set([
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
]);

export function executionKind(card: DiscoveredAgentCard): "a2a" | "mcp" | "local" | null {
  return remoteExecutable(card) || (LOCAL_HANDLERS.has(card.name.trim().toLowerCase()) ? "local" : null);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-/\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function scoreAgent(query: string, card: DiscoveredAgentCard): AgentMatch {
  const tokens = tokenize(query);
  const reasons: MatchReason[] = [];
  let score = 0;
  const matchedSkills: string[] = [];

  const nameTokens = tokenize(card.name);
  const descTokens = tokenize(card.description);

  for (const t of tokens) {
    if (nameTokens.includes(t) || card.name.toLowerCase().includes(t)) {
      score += 4.5;
      reasons.push({ field: "name", detail: `name~${t}`, weight: 4.5 });
    }
    if (descTokens.includes(t) || card.description.toLowerCase().includes(t)) {
      score += 2.2;
      reasons.push({ field: "description", detail: `desc~${t}`, weight: 2.2 });
    }
    for (const skill of card.skills) {
      const hay = `${skill.id || ""} ${skill.name || ""} ${skill.description || ""}`.toLowerCase();
      const tags = (skill.tags || []).map((x) => x.toLowerCase());
      if (hay.includes(t)) {
        score += 3.4;
        const label = skill.name || skill.id || "skill";
        if (!matchedSkills.includes(label)) matchedSkills.push(label);
        reasons.push({ field: "skill", detail: `${label}~${t}`, weight: 3.4 });
      }
      if (tags.includes(t) || tags.some((tag) => tag.includes(t) || t.includes(tag))) {
        score += 3.8;
        const label = skill.name || skill.id || "skill";
        if (!matchedSkills.includes(label)) matchedSkills.push(label);
        reasons.push({ field: "tag", detail: `tag:${t}`, weight: 3.8 });
      }
    }
    for (const cap of card.capabilities) {
      if (cap.toLowerCase().includes(t)) score += 1.2;
    }
  }

  // Phrase bonuses for common orchestration demos (not weather)
  const q = query.toLowerCase();
  const boost = (cond: boolean, w: number, detail: string, field: MatchReason["field"] = "skill") => {
    if (!cond) return;
    score += w;
    reasons.push({ field, detail, weight: w });
  };

  boost(/\bnda\b|mutual nondisclosure|non-disclosure|agreement template|msa\b/.test(q) && /openagreements|legal|nda|agreement/.test(`${card.name} ${card.description}`.toLowerCase()), 12, "legal-template-intent");
  boost(/owasp|vulnerab|cve|secure coding|code review|pull request security/.test(q) && /code guardian|security|owasp/.test(`${card.name} ${card.description}`.toLowerCase()), 11, "security-review-intent");
  boost(/payslip|payroll|overtime|superannuation/.test(q) && /payroll/.test(card.name.toLowerCase()), 10, "payroll-intent");
  boost(/invoice|xero|commission/.test(q) && /invoice/.test(card.name.toLowerCase()), 10, "invoice-intent");
  boost(/leave policy|handbook|shared folder|workplace doc|cv match|job match|hiring|candidate/.test(q) && /knowledge|handbook|leave|hiring|recruit/.test(`${card.name} ${card.description}`.toLowerCase()), 10, "knowledge-intent");
  boost(/reverse:|shout:|echo/.test(q) && /echo/.test(card.name.toLowerCase()), 14, "echo-protocol-intent");
  boost(/outage|sev-|incident|page the on-call/.test(q) && /incident/.test(card.name.toLowerCase()), 10, "incident-intent");
  boost(/\bsql\b|query the|read-only select/.test(q) && /sql/.test(card.name.toLowerCase()), 10, "sql-intent");

  // Prefer richer skill cards slightly when tied
  score += Math.min(card.skills.length, 4) * 0.15;

  const executable = executionKind(card);
  const uniqueReasons = reasons
    .sort((a, b) => b.weight - a.weight)
    .filter((r, i, arr) => arr.findIndex((x) => x.detail === r.detail) === i)
    .slice(0, 6);

  return {
    agent: card,
    score,
    confidence: 0, // filled after normalization
    matchedSkills: matchedSkills.slice(0, 4),
    reasons: uniqueReasons,
    executable,
  };
}

export function rankAgents(query: string, cards: DiscoveredAgentCard[] = getSeededCards(), limit = 8): AgentMatch[] {
  const ranked = cards
    .map((c) => scoreAgent(query, c))
    .sort((a, b) => b.score - a.score || a.agent.name.localeCompare(b.agent.name));

  const top = ranked[0]?.score || 1;
  return ranked.slice(0, limit).map((m) => ({
    ...m,
    confidence: Math.round(Math.min(99, Math.max(8, (m.score / Math.max(top, 0.001)) * 96))),
  }));
}

export function localSkillReply(card: DiscoveredAgentCard, query: string): string {
  const name = card.name.trim().toLowerCase();
  const q = query.trim();

  if (name === "code guardian") {
    return [
      `Code Guardian matched your request.`,
      ``,
      `Security review sketch for: “${q}”`,
      `1. AuthZ — confirm every new route checks workspace membership before reads.`,
      `2. Injection — parameterize SQL / avoid string-built filters.`,
      `3. Secrets — no service-role keys in client bundles; scan for EXPO_PUBLIC misuse.`,
      `4. Supply chain — pin critical deps; flag known CVEs in lockfile diffs.`,
      `5. OWASP ASVS L1 — validate uploads and SSRF allowlists on any fetch proxy.`,
      ``,
      `Highest-priority follow-up: add an allowlist regression test for outbound agent URLs.`,
    ].join("\n");
  }

  if (name === "payroll copilot") {
    return [
      `Payroll Copilot here.`,
      `For “${q}”:`,
      `• Ordinary hours vs overtime should be split on the payslip lines.`,
      `• Check the award / employment contract for overtime multipliers.`,
      `• Superannuation typically applies to OTE — verify with your payroll provider.`,
      `• Next cutoff: treat bank files as final 24h before pay day.`,
      ``,
      `This is guidance for employers, not legal advice.`,
    ].join("\n");
  }

  if (name === "invoice concierge") {
    return [
      `Invoice Concierge draft:`,
      `• Parse the ask into supplier, amount, due date, and cost centre.`,
      `• Create a draft invoice; mark commission lines separately from owner draws.`,
      `• Queue Xero sync and surface status: pending → synced / error.`,
      ``,
      `Ask: “${q}”`,
    ].join("\n");
  }

  if (name === "jobgrid hiring knowledge") {
    return [
      `JobGrid Hiring Knowledge matched your request.`,
      `Query: “${q}”`,
      `Typical sources: live job ads, candidate CVs, match scores, and employer chat threads.`,
      `In production this calls JobGrid matching + chat APIs with the caller’s session.`,
    ].join("\n");
  }

  if (name === "legal redline scout") {
    return [
      `Legal Redline Scout (demo):`,
      `Flagged themes for “${q}”:`,
      `• Unlimited indemnity / liability caps missing`,
      `• Broad IP assignment without carve-outs`,
      `• Auto-renew with short notice windows`,
      `Not a substitute for qualified counsel.`,
    ].join("\n");
  }

  if (name === "incident triage") {
    return [
      `Incident Triage:`,
      `Working severity guess for “${q}”: SEV-2 (user-visible degradation, workaround exists).`,
      `Next steps: page primary on-call → freeze deploys → status page draft → 30-min update cadence.`,
    ].join("\n");
  }

  if (name === "sql analyst") {
    return [
      `SQL Analyst (read-only sketch):`,
      `-- for: ${q}`,
      `SELECT date_trunc('day', created_at) AS day, count(*) AS events`,
      `FROM analytics_events`,
      `WHERE created_at >= now() - interval '14 days'`,
      `GROUP BY 1`,
      `ORDER BY 1;`,
      ``,
      `Chart hint: line chart on day vs events.`,
    ].join("\n");
  }

  if (name === "agent card validator") {
    return [
      `Agent Card Validator:`,
      `Checklist for “${q}”:`,
      `✓ name, description, url`,
      `✓ skills[].id unique kebab-case`,
      `✓ tags present for discovery`,
      `✓ preferredTransport declared`,
      `Serve at /.well-known/agent-card.json with application/json.`,
    ].join("\n");
  }

  if (name === "devops runbook") {
    return [
      `DevOps Runbook:`,
      `For “${q}”:`,
      `1. Confirm canary health + error budget`,
      `2. Rollback via last known good revision`,
      `3. Verify migrations are backward compatible before re-deploy`,
    ].join("\n");
  }

  if (name === "meeting scribe") {
    return [
      `Meeting Scribe:`,
      `Summary seed for “${q}”:`,
      `• Decision: TBD`,
      `• Actions: owner + due date`,
      `• Risks: call out blockers in the first paragraph`,
    ].join("\n");
  }

  const skill = card.skills[0]?.name || "primary skill";
  return `${card.name} selected for “${q}”. Matched skill: ${skill}.\n\n${card.description}`;
}

export function buildSteps(scanned: number, shortlist: AgentMatch[], winner: AgentMatch, executed: boolean): OrchestrateStep[] {
  return [
    { id: "ingest", label: "Ingest request", status: "done", meta: "normalized query tokens" },
    { id: "scan", label: `Scan agent mesh`, status: "done", meta: `${scanned} Agent Cards` },
    {
      id: "rank",
      label: "Rank by skills & tags",
      status: "done",
      meta: shortlist
        .slice(0, 3)
        .map((m) => `${m.agent.name} ${m.confidence}%`)
        .join(" · "),
    },
    {
      id: "route",
      label: `Route → ${winner.agent.name}`,
      status: "done",
      meta: winner.matchedSkills[0] ? `skill: ${winner.matchedSkills[0]}` : winner.executable || "catalog match",
    },
    {
      id: "exec",
      label: executed ? "Execute winning skill" : "Match only (not remotely callable)",
      status: "done",
      meta: winner.executable || "directory",
    },
  ];
}
