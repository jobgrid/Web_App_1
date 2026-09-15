import type { Metadata } from "next";
import A2ARegistryClient from "@/components/concepts/a2a-registry-client";
import { crawlAgentCards, getSeededCards } from "@/lib/a2a/crawl";

export const metadata: Metadata = {
  title: "A2A Agent Card registry · JobGrid concept",
  description:
    "Concept registry that crawls A2A Agent Cards from /.well-known/agent-card.json and GitHub.",
};

export const dynamic = "force-dynamic";

export default async function A2ARegistryConceptPage() {
  // Prefer seed for first paint; client can re-crawl live
  const cards = getSeededCards().slice(0, 50);
  let initial: {
    crawledAt: string;
    ok: number;
    failed: number;
    cards: ReturnType<typeof getSeededCards>;
    mode: "seed" | "live";
  } = {
    crawledAt: new Date().toISOString(),
    ok: cards.length,
    failed: 0,
    cards,
    mode: "seed",
  };

  try {
    // Soft live enrich (ignore failures — seed is enough for the concept)
    const live = await crawlAgentCards(50);
    if (live.cards.length > 0) {
      initial = { ...live, mode: "live" };
    }
  } catch {
    // keep seed
  }

  return <A2ARegistryClient initial={initial} />;
}
