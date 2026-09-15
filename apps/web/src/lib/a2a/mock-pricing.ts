/**
 * MOCK DATA — Phase 0 prototype only.
 *
 * Labels are estimated task costs for UI review (not Agent Card truth).
 * Toggle USE_MOCK_PRICING off to force “Pricing unknown” everywhere.
 */
import type { DiscoveredAgentCard } from "./types";

/** Development/UI flag — set false to force “Pricing unknown” everywhere. */
export const USE_MOCK_PRICING = true;

export type MockPrice = {
  tier: "free" | "paid" | "unknown";
  /** Estimated cost for this task: FREE | $0.18 | Pricing unknown */
  label: string;
  monthlyLabel: string;
  source: "mock";
};

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

const FREE_NAMES = new Set([
  "echo agent (demo)",
  "openagreements",
  "text toolkit (sample)",
  "jobgrid hiring knowledge",
]);

const UNKNOWN_NAMES = new Set(["global a2a registry"]);

/** Curated micro task estimates (dollars for the whole task). */
const TASK_ESTIMATE: Record<string, number> = {
  "research librarian": 0.18,
  "crm scout": 0.45,
  "email composer": 0.12,
  "marketing brief agent": 0.24,
  "code guardian": 0.32,
  "sql analyst": 0.15,
  "content planner": 0.2,
  "design critique": 0.22,
  "payroll copilot": 0.1,
  "invoice concierge": 0.14,
  "sales playbook": 0.28,
};

function formatDollars(n: number): string {
  return `$${n.toFixed(2)}`;
}

function freePrice(): MockPrice {
  return { tier: "free", label: "FREE", monthlyLabel: "$0", source: "mock" };
}

function unknownPrice(): MockPrice {
  return { tier: "unknown", label: "Pricing unknown", monthlyLabel: "Unknown", source: "mock" };
}

export function getMockPricing(agent: DiscoveredAgentCard): MockPrice {
  if (!USE_MOCK_PRICING) return unknownPrice();

  const key = agent.name.trim().toLowerCase();

  if (FREE_NAMES.has(key)) return freePrice();
  if (UNKNOWN_NAMES.has(key)) return unknownPrice();

  if (TASK_ESTIMATE[key] != null) {
    const dollars = TASK_ESTIMATE[key];
    return {
      tier: "paid",
      label: formatDollars(dollars),
      monthlyLabel: `$${Math.max(9, Math.round(dollars * 80))}`,
      source: "mock",
    };
  }

  try {
    if (agent.url) {
      const host = new URL(agent.url).host;
      if (host === "a2a-inspector.davidcjw.com" || host === "openagreements.org") {
        return freePrice();
      }
    }
  } catch {
    /* ignore */
  }

  if (!agent.url) return unknownPrice();

  // Sparse mock estimates for remaining live cards — do not invent for every name
  const h = hash(key);
  if (h % 5 === 0) return unknownPrice();
  const dollars = Math.round((0.04 + (h % 40) / 100) * 100) / 100;
  return {
    tier: "paid",
    label: formatDollars(dollars),
    monthlyLabel: `$${5 + (h % 40)}`,
    source: "mock",
  };
}

/** Sum mock monthly labels for a team — returns Unknown if any seat is unknown. */
export function sumMonthly(labels: string[]): string {
  if (labels.some((l) => l === "Unknown" || l === "Pricing unknown")) return "Unknown";
  let total = 0;
  for (const l of labels) {
    if (l === "$0" || l === "Free" || l === "FREE") continue;
    const n = Number(String(l).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n)) total += n;
  }
  return total === 0 ? "$0" : `$${total}`;
}

export function sumTask(labels: string[]): string {
  if (labels.every((l) => l === "Free" || l === "FREE" || l === "$0")) return "FREE";
  if (labels.some((l) => l === "Unknown" || l === "Pricing unknown")) {
    const paid = labels.filter((l) => l.startsWith("$") && l !== "$0");
    if (!paid.length) return "Pricing unknown";
    let cents = 0;
    for (const l of paid) {
      const n = Number(String(l).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n)) cents += Math.round(n * 100);
    }
    return `Estimated known $${(cents / 100).toFixed(2)}`;
  }
  let cents = 0;
  for (const l of labels) {
    if (l === "Free" || l === "FREE" || l === "$0") continue;
    const n = Number(String(l).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n)) cents += Math.round(n * 100);
  }
  return cents === 0 ? "FREE" : `$${(cents / 100).toFixed(2)}`;
}
