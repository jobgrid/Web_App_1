import { getMarketplaceCatalog } from "./marketplace";
import { rankAgents, type AgentMatch } from "./orchestrate";
import type { DiscoveredAgentCard } from "./types";
import { getMockPricing, sumMonthly, sumTask, type MockPrice } from "./mock-pricing";
import { getMockReputation, type MockReputation } from "./mock-reputation";

export type Preference = "best" | "free" | "fastest" | "quality";

export type CapabilityNeed = {
  id: string;
  label: string;
  queryBoost: string;
  why: string;
};

export type TeamSeat = {
  capability: CapabilityNeed;
  match: AgentMatch | null;
  price: MockPrice;
  reputation: MockReputation | null;
  whySelected: string;
};

export type SearchHit = {
  agent: DiscoveredAgentCard;
  confidence: number;
  matchedSkills: string[];
  price: MockPrice;
  reputation: MockReputation;
  snippet: string;
};

export type AccomplishPlan = {
  goal: string;
  capabilities: CapabilityNeed[];
  seats: TeamSeat[];
  results: SearchHit[];
  scanned: number;
  preference: Preference;
  estimatedLabel: string;
  monthlyLabel: string;
};

const CAPABILITY_LIBRARY: Array<{
  id: string;
  label: string;
  triggers: RegExp;
  queryBoost: string;
  why: string;
}> = [
  {
    id: "research",
    label: "Research",
    triggers: /research|competitor|analy[sz]e|market|insight|brief|investigate/i,
    queryBoost: "research brief citations sources comparison market analysis",
    why: "Understands the landscape before work begins",
  },
  {
    id: "leads",
    label: "Lead Discovery",
    triggers: /lead|prospect|find \d+|dental|practices?|clinic|list of|directory|sydney|enrich|crm|sales/i,
    queryBoost: "crm scout enrich account pipeline sales leads prospects directory",
    why: "Finds and structures the right targets",
  },
  {
    id: "copy",
    label: "Copywriting",
    triggers: /email|copy|write|campaign|outreach|subject|message|content|newsletter/i,
    queryBoost: "email composer draft marketing copy content outline subject lines",
    why: "Crafts persuasive language for the audience",
  },
  {
    id: "design",
    label: "Design",
    triggers: /design|visual|brand|website|landing|creative|ui|layout|storyboard/i,
    queryBoost: "design critique ui ux accessibility creative storyboard",
    why: "Shapes how the work looks and feels",
  },
  {
    id: "email_mkt",
    label: "Email Marketing",
    triggers: /email marketing|campaign|nurture|drip|newsletter|sequence/i,
    queryBoost: "marketing brief campaign social email content calendar",
    why: "Turns assets into a runnable campaign",
  },
  {
    id: "legal",
    label: "Legal Templates",
    triggers: /\bnda\b|contract|agreement|msa|legal|template/i,
    queryBoost: "nda legal agreement template contract openagreements",
    why: "Sources the right agreement templates",
  },
  {
    id: "security",
    label: "Security Review",
    triggers: /security|owasp|vulnerab|cve|code review|secure/i,
    queryBoost: "code guardian security owasp cve vulnerability review",
    why: "Checks for risk before you ship",
  },
  {
    id: "payroll",
    label: "Payroll",
    triggers: /payroll|payslip|overtime|wages/i,
    queryBoost: "payroll payslip overtime wages cutoff",
    why: "Interprets payroll details clearly",
  },
  {
    id: "knowledge",
    label: "Workplace Knowledge",
    triggers: /handbook|leave policy|hr policy|workplace|shared folder|document/i,
    queryBoost: "knowledge handbook leave policy hr documents folders",
    why: "Answers from your workplace documents",
  },
  {
    id: "devops",
    label: "DevOps",
    triggers: /deploy|rollback|incident|outage|kubernetes|runbook/i,
    queryBoost: "devops deploy rollback incident runbook observability",
    why: "Handles operational runbooks and incidents",
  },
  {
    id: "data",
    label: "Data & SQL",
    triggers: /\bsql\b|analytics|dashboard|kpi|query|data/i,
    queryBoost: "sql analytics query kpi dashboard narrator",
    why: "Turns questions into data answers",
  },
  {
    id: "meetings",
    label: "Meetings",
    triggers: /meeting|summar|calendar|schedule|action items/i,
    queryBoost: "meeting summary action items calendar schedule",
    why: "Captures decisions and next steps",
  },
];

function defaultCapabilitiesForGoal(goal: string): CapabilityNeed[] {
  const matched = CAPABILITY_LIBRARY.filter((c) => c.triggers.test(goal)).map((c) => ({
    id: c.id,
    label: c.label,
    queryBoost: c.queryBoost,
    why: c.why,
  }));

  if (matched.length >= 2) return matched.slice(0, 6);

  // Fallback team for open-ended goals — still outcome-shaped, not marketplace
  return [
    {
      id: "research",
      label: "Research",
      queryBoost: "research brief citations sources",
      why: "Clarifies the objective and context",
    },
    {
      id: "copy",
      label: "Copywriting",
      queryBoost: "email draft marketing copy content",
      why: "Produces the written artefacts",
    },
    {
      id: "design",
      label: "Design",
      queryBoost: "design critique creative ui",
      why: "Shapes presentation and polish",
    },
  ];
}

function whyFromMatch(capability: CapabilityNeed, match: AgentMatch): string {
  const skill = match.matchedSkills[0];
  if (skill) return `Strong match on “${skill}” for ${capability.label.toLowerCase()}.`;
  const tag = match.reasons.find((r) => r.field === "tag" || r.field === "skill");
  if (tag) return `Matched ${capability.label.toLowerCase()} via ${tag.detail}.`;
  return capability.why;
}

function passesPreference(price: MockPrice, preference: Preference): boolean {
  if (preference === "free") return price.tier === "free";
  return true;
}

export function buildAccomplishPlan(goal: string, preference: Preference = "best"): AccomplishPlan {
  const cards = getMarketplaceCatalog();
  const capabilities = defaultCapabilitiesForGoal(goal);
  const used = new Set<string>();
  const seats: TeamSeat[] = [];

  for (const capability of capabilities) {
    // Score primarily on the capability need — avoid the whole goal drowning every seat
    // into the same marketing/campaign agents. Keep the goal for lead discovery (places, niches).
    const matchQuery =
      capability.id === "leads" || capability.id === "legal" || capability.id === "security" || capability.id === "payroll"
        ? `${capability.queryBoost} ${goal}`
        : `${capability.label} ${capability.queryBoost}`;
    const ranked = rankAgents(matchQuery, cards, 12);
    let pick: AgentMatch | undefined;

    for (const m of ranked) {
      const key = m.agent.name.toLowerCase();
      if (used.has(key)) continue;
      const price = getMockPricing(m.agent);
      if (!passesPreference(price, preference)) continue;
      // soft quality preference: prefer higher confidence
      pick = m;
      if (preference === "quality" && m.confidence < 55) continue;
      if (preference === "fastest") {
        // Prefer local/executable as a stand-in for "fast" in Phase 0
        if (m.executable) {
          pick = m;
          break;
        }
      }
      break;
    }

    // If free-only exhausted, leave seat empty rather than invent an agent
    if (!pick && preference === "free") {
      seats.push({
        capability,
        match: null,
        price: { tier: "unknown", label: "Pricing unknown", monthlyLabel: "Unknown", source: "mock" },
        reputation: null,
        whySelected: "No free agent matched this capability in the current catalog.",
      });
      continue;
    }

    if (!pick) pick = ranked.find((m) => !used.has(m.agent.name.toLowerCase())) || ranked[0];

    if (pick) {
      used.add(pick.agent.name.toLowerCase());
      const price = getMockPricing(pick.agent);
      seats.push({
        capability,
        match: pick,
        price,
        reputation: getMockReputation(pick.agent),
        whySelected: whyFromMatch(capability, pick),
      });
    }
  }

  const results: SearchHit[] = rankAgents(goal, cards, 14).map((m) => {
    const price = getMockPricing(m.agent);
    const reputation = getMockReputation(m.agent);
    const skillBit = m.matchedSkills[0] ? ` Skill: ${m.matchedSkills[0]}.` : "";
    return {
      agent: m.agent,
      confidence: m.confidence,
      matchedSkills: m.matchedSkills,
      price,
      reputation,
      snippet: `${m.agent.description.slice(0, 180)}${m.agent.description.length > 180 ? "…" : ""}${skillBit}`,
    };
  });

  const estimatedLabel = sumTask(seats.map((s) => s.price.label));
  const monthlyLabel = sumMonthly(seats.map((s) => s.price.monthlyLabel));

  return {
    goal,
    capabilities,
    seats,
    results,
    scanned: cards.length,
    preference,
    estimatedLabel,
    monthlyLabel,
  };
}

export function catalogSnapshot(): DiscoveredAgentCard[] {
  return getMarketplaceCatalog();
}
