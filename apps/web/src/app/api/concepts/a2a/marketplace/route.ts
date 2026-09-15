import { NextResponse } from "next/server";
import { getListedAgents, getMarketplaceCatalog } from "@/lib/a2a/marketplace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** QC-passed marketplace list (plus catalog seeds). */
export async function GET() {
  const listed = getListedAgents();
  const catalog = getMarketplaceCatalog();
  return NextResponse.json({
    listed: listed.length,
    catalog: catalog.length,
    cards: listed,
    scanned: catalog.map((c) => ({
      name: c.name,
      discovery: c.discovery,
      listed: Boolean(c.listed || c.qc?.passed),
      grade: c.qc?.grade || null,
    })),
  });
}
