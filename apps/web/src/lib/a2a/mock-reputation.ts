/**
 * MOCK DATA — Phase 0 prototype only.
 *
 * Ratings, verification, job counts, and icons are NOT from A2A Agent Cards.
 * They exist only to exercise marketplace-style UI before real reputation exists.
 */
import type { DiscoveredAgentCard } from "./types";

export type MockReputation = {
  verified: boolean;
  rating: number | null; // 1–5, null = unrated
  reviewCount: number;
  jobsCompleted: number;
  timesUsed: number;
  /** Deterministic icon key for UI marks */
  iconKey: string;
  source: "mock";
};

const VERIFIED_NAMES = new Set([
  "openagreements",
  "echo agent (demo)",
  "research librarian",
  "crm scout",
  "email composer",
  "marketing brief agent",
  "code guardian",
  "jobgrid hiring knowledge",
  "payroll copilot",
]);

const ICON_KEYS = [
  "orbit",
  "hex",
  "pulse",
  "leaf",
  "bolt",
  "mark",
  "ring",
  "grid",
  "wave",
  "spark",
] as const;

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function seededStats(name: string): Omit<MockReputation, "verified" | "source" | "iconKey"> {
  const h = hashName(name.toLowerCase());
  const jobsCompleted = 40 + (h % 920);
  const timesUsed = jobsCompleted + (h % 400);
  const rated = h % 7 !== 0; // some unrated
  const rating = rated ? Math.round((3.6 + ((h >> 3) % 15) / 10) * 10) / 10 : null;
  const reviewCount = rated ? 8 + (h % 210) : 0;
  return { rating, reviewCount, jobsCompleted, timesUsed };
}

export function getMockReputation(agent: DiscoveredAgentCard): MockReputation {
  const key = agent.name.trim().toLowerCase();
  const verified = agent.qc?.passed ?? VERIFIED_NAMES.has(key);
  const stats = seededStats(agent.name);
  // Verified marketplace demos always show a rating for clearer UI
  if (verified && stats.rating == null) {
    const h = hashName(key);
    stats.rating = Math.round((4.2 + ((h >> 2) % 8) / 10) * 10) / 10;
    stats.reviewCount = 24 + (h % 180);
  }
  const iconKey = ICON_KEYS[hashName(key) % ICON_KEYS.length];
  return {
    ...stats,
    verified,
    iconKey,
    source: "mock",
  };
}
