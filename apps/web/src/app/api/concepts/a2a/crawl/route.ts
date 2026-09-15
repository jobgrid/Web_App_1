import { NextResponse } from "next/server";
import { crawlAgentCards, getSeededCards } from "@/lib/a2a/crawl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Concept API: crawl public A2A Agent Cards from well-known URIs + GitHub.
 * GET ?mode=seed  → cached discovered cards
 * GET ?mode=live  → re-fetch seed URLs (default)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "live";
  const limit = Math.min(Number(searchParams.get("limit") || 50) || 50, 50);

  if (mode === "seed") {
    return NextResponse.json({
      crawledAt: new Date().toISOString(),
      ok: getSeededCards().length,
      failed: 0,
      cards: getSeededCards().slice(0, limit),
      mode: "seed",
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
