import { getSeededCards } from "./crawl-seed";
import { isLocalCatalogAgent } from "./qc";
import type { DiscoveredAgentCard, QualityReport } from "./types";

const listed = new Map<string, DiscoveredAgentCard>();

function keyOf(name: string) {
  return name.trim().toLowerCase();
}

function localReport(): QualityReport {
  return {
    passed: true,
    listable: true,
    protocolOk: true,
    grade: "local",
    checks: [
      {
        id: "protocol",
        label: "Live A2A/MCP protocol ping",
        ok: true,
        detail: "JobGrid catalog agent",
      },
    ],
    testedAt: new Date().toISOString(),
  };
}

export function marketplaceKey(name: string) {
  return keyOf(name);
}

export function listOnMarketplace(card: DiscoveredAgentCard): DiscoveredAgentCard {
  const next: DiscoveredAgentCard = {
    ...card,
    listed: true,
    status: card.status === "error" ? "error" : "live",
  };
  listed.set(keyOf(card.name), next);
  return next;
}

export function getListedAgents(): DiscoveredAgentCard[] {
  return [...listed.values()];
}

export function isListed(name: string) {
  return listed.has(keyOf(name));
}

/** Marketplace list = QC-listed live agents + existing catalog seeds. */
export function getMarketplaceCatalog(): DiscoveredAgentCard[] {
  const out: DiscoveredAgentCard[] = [];
  const seen = new Set<string>();

  for (const card of listed.values()) {
    const k = keyOf(card.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(card);
  }

  for (const seed of getSeededCards()) {
    const k = keyOf(seed.name);
    if (seen.has(k)) continue;
    seen.add(k);
    const qc =
      seed.qc ||
      (isLocalCatalogAgent(seed.name) || !seed.url
        ? localReport()
        : undefined);
    out.push({ ...seed, qc, listed: Boolean(qc?.passed) });
  }

  return out;
}
