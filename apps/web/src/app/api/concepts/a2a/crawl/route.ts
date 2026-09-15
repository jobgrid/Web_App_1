import { NextResponse } from "next/server";
import { crawlAgentCards, getSeededCards } from "@/lib/a2a/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Discover A2A Agent Cards from well-known URIs, GitHub, and a2aregistry.org.
 * Live mode QC-tests endpoints; protocol-passing cards are listed on the marketplace.
 *
 * GET ?mode=seed  → cached catalog
 * GET ?mode=live  → GitHub + registry crawl + QC (default)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "live";
  const limit = Math.min(Number(searchParams.get("limit") || 80) || 80, 120);

  if (mode === "seed") {
    const cards = getSeededCards().slice(0, limit);
    return NextResponse.json({
      crawledAt: new Date().toISOString(),
      ok: cards.length,
      failed: 0,
      cards,
      mode: "seed",
      githubHits: 0,
      listed: 0,
      qcPassed: 0,
    });
  }

  try {
    const result = await crawlAgentCards(limit);
    return NextResponse.json({ ...result, mode: "live" });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Crawl failed",
        cards: getSeededCards().slice(0, limit),
        mode: "fallback",
      },
      { status: 200 }
    );
  }
}
