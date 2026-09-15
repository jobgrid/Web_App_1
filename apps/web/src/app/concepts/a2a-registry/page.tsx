import type { Metadata } from "next";
import A2ARegistryClient from "@/components/concepts/a2a-registry-client";
import { getSeededCards } from "@/lib/a2a/crawl";

export const metadata: Metadata = {
  title: "A2A Agent Card registry · JobGrid concept",
  description:
    "Discover A2A Agent Cards on GitHub and well-known URIs, QC-test them, then list passers on the marketplace.",
};

export const dynamic = "force-dynamic";

export default async function A2ARegistryConceptPage() {
  const cards = getSeededCards();
  return (
    <A2ARegistryClient
      initial={{
        crawledAt: new Date().toISOString(),
        ok: cards.length,
        failed: 0,
        cards,
        mode: "seed",
        githubHits: 0,
        listed: 0,
        qcPassed: 0,
      }}
    />
  );
}
