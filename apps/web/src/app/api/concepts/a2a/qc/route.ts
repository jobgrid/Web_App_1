import { NextResponse } from "next/server";
import { z } from "zod";
import { listOnMarketplace } from "@/lib/a2a/marketplace";
import { runQualityControl } from "@/lib/a2a/qc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  sourceUrl: z.string().url().optional(),
  url: z.string().url().optional().nullable(),
  name: z.string().min(1).max(160).optional(),
  list: z.boolean().optional(),
});

/**
 * QC an Agent Card before Connect / marketplace listing.
 * list=true adds the agent to the live marketplace only when the protocol ping passes.
 */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.sourceUrl && !body.url && !body.name) {
    return NextResponse.json({ error: "Provide sourceUrl, url, or name" }, { status: 400 });
  }

  try {
    const { report, card } = await runQualityControl({
      sourceUrl: body.sourceUrl,
      url: body.url,
      name: body.name,
      probeProtocol: true,
    });

    let listed = false;
    let listedCard = card;
    if (body.list) {
      if (!report.passed) {
        return NextResponse.json(
          {
            error: "QC failed — agent was not added to the marketplace",
            ...report,
            card,
          },
          { status: 422 }
        );
      }
      if (card) {
        listedCard = listOnMarketplace(card);
        listed = true;
      }
    }

    return NextResponse.json({
      ...report,
      listed,
      card: listedCard,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "QC failed" },
      { status: 502 }
    );
  }
}
