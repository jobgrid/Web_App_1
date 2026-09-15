import seeded from "./seeded-cards.json";
import type { DiscoveredAgentCard } from "./types";

export function getSeededCards(): DiscoveredAgentCard[] {
  return (seeded.cards as DiscoveredAgentCard[]).map((c) => ({
    ...c,
    status: "cached" as const,
  }));
}

export function getSeedUrls(): string[] {
  return seeded.seedUrls as string[];
}
