import { getSeededCards, getSeedUrls } from "./crawl-seed";
import { discoverGithubAgentCards, fetchGithubCard } from "./github-discover";
import { listOnMarketplace } from "./marketplace";
import { qualityControlFetchedCard } from "./qc";
import { normalizeAgentCard } from "./normalize";
import { discoverA2ARegistryCards } from "./registry-discover";
import { SafeFetchError, safeFetchJson } from "./safe-fetch";
import { inspectPublicHttpsUrl } from "./url-safety";
import type { CrawlResult, DiscoveredAgentCard } from "./types";

export { getSeededCards, getSeedUrls };

const DEFAULT_TIMEOUT_MS = 10_000;

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(concurrency, Math.max(items.length, 0));
  if (!n) return [];
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function fetchCard(url: string): Promise<DiscoveredAgentCard> {
  try {
    const fetched = await safeFetchJson(url, { timeoutMs: DEFAULT_TIMEOUT_MS });
    if (!fetched.json || typeof fetched.json !== "object" || Array.isArray(fetched.json)) {
      throw new SafeFetchError("Not a valid Agent Card object");
    }
    const normalized = normalizeAgentCard(fetched.json as Record<string, unknown>, url);
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
  }
}

function mergeCard(seen: Set<string>, cards: DiscoveredAgentCard[], card: DiscoveredAgentCard) {
  const key = card.name.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  cards.push(card);
}

/**
 * Discover Agent Cards from well-known URIs, GitHub, and a2aregistry.org,
 * then QC-test live endpoints. Only protocol-passing cards are listed.
 */
export async function crawlAgentCards(limit = 80): Promise<CrawlResult> {
  const githubHits = await discoverGithubAgentCards(Math.min(48, Math.max(limit, 24)));
  let registryUrls: string[] = [];
  try {
    registryUrls = await discoverA2ARegistryCards(30);
  } catch {
    registryUrls = [];
  }

  const seedUrls = getSeedUrls();
  const urlSeen = new Set<string>();
  const fetchUrls: string[] = [];
  for (const url of [...seedUrls, ...registryUrls]) {
    const key = url.toLowerCase();
    if (urlSeen.has(key)) continue;
    urlSeen.add(key);
    fetchUrls.push(url);
  }

  const [seededLive, githubCards] = await Promise.all([
    mapPool(fetchUrls, 6, fetchCard),
    mapPool(githubHits, 6, fetchGithubCard),
  ]);

  const candidates: DiscoveredAgentCard[] = [];
  const failed: DiscoveredAgentCard[] = [];
  const seen = new Set<string>();

  for (const card of [...seededLive, ...githubCards]) {
    if (card.status === "error") {
      failed.push(card);
      continue;
    }
    mergeCard(seen, candidates, card);
  }

  let probesLeft = 28;
  const qcCards: DiscoveredAgentCard[] = [];
  for (const card of candidates) {
    const canProbe = Boolean(card.url && inspectPublicHttpsUrl(card.url).ok && probesLeft > 0);
    if (canProbe) probesLeft -= 1;
    const { report, card: next } = await qualityControlFetchedCard(card, { probeProtocol: canProbe });
    if (report.passed) {
      qcCards.push(listOnMarketplace(next));
    } else {
      qcCards.push(next);
    }
  }

  return {
    crawledAt: new Date().toISOString(),
    ok: qcCards.filter((c) => c.status !== "error").length,
    failed: failed.length,
    cards: [...qcCards, ...failed],
    githubHits: githubHits.length,
    listed: qcCards.filter((c) => c.qc?.passed).length,
    qcPassed: qcCards.filter((c) => c.qc?.passed).length,
  };
}
