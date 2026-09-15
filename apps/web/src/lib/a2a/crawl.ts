import seeded from "./seeded-cards.json";
import { normalizeAgentCard } from "./normalize";
import type { CrawlResult, DiscoveredAgentCard } from "./types";

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchCard(url: string): Promise<DiscoveredAgentCard> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, application/a2a+json;q=0.9, */*;q=0.1",
        "User-Agent": "JobGrid-A2A-CardCrawler/0.1 (+https://www.jobgrid.ai)",
      },
      // Agent cards are public discovery docs
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        name: url,
        description: "",
        skills: [],
        capabilities: [],
        sourceUrl: url,
        discovery: "unknown",
        status: "error",
        error: `HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    const normalized = normalizeAgentCard(json, url);
    if (!normalized) {
      return {
        name: url,
        description: "",
        skills: [],
        capabilities: [],
        sourceUrl: url,
        discovery: "unknown",
        status: "error",
        error: "Not a valid Agent Card (missing name)",
      };
    }
    return normalized;
  } catch (e) {
    return {
      name: url,
      description: "",
      skills: [],
      capabilities: [],
      sourceUrl: url,
      discovery: "unknown",
      status: "error",
      error: e instanceof Error ? e.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getSeededCards(): DiscoveredAgentCard[] {
  return (seeded.cards as DiscoveredAgentCard[]).map((c) => ({
    ...c,
    status: "cached" as const,
  }));
}

export function getSeedUrls(): string[] {
  return seeded.seedUrls as string[];
}

/** Crawl well-known + GitHub-published Agent Cards (A2A discovery). */
export async function crawlAgentCards(limit = 50): Promise<CrawlResult> {
  const urls = getSeedUrls();
  const settled = await Promise.all(urls.map((u) => fetchCard(u)));

  const live: DiscoveredAgentCard[] = [];
  const failed: DiscoveredAgentCard[] = [];
  const seen = new Set<string>();

  for (const card of settled) {
    if (card.status === "error") {
      failed.push(card);
      continue;
    }
    const key = card.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    live.push(card);
  }

  // Fill with cached seed if live crawl under-delivers
  const cards = [...live];
  if (cards.length < limit) {
    for (const seed of getSeededCards()) {
      const key = seed.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push(seed);
      if (cards.length >= limit) break;
    }
  }

  return {
    crawledAt: new Date().toISOString(),
    ok: live.length,
    failed: failed.length,
    cards: cards.slice(0, limit),
  };
}
