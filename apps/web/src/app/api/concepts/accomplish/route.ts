import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAccomplishPlan, type Preference } from "@/lib/a2a/accomplish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  goal: z.string().min(1).max(2000),
  preference: z.enum(["best", "free", "fastest", "quality"]).optional(),
});

function agentPayload(
  agent: {
    name: string;
    description: string;
    provider?: { organization?: string } | null;
    skills: Array<{ name?: string; id?: string }>;
    discovery: string;
    sourceUrl: string;
    url?: string;
  },
  extras: {
    confidence?: number;
    skillsOverride?: string[];
    price: unknown;
    reputation: unknown;
  }
) {
  return {
    name: agent.name,
    description: agent.description,
    provider: agent.provider?.organization || null,
    skills:
      extras.skillsOverride ||
      agent.skills.slice(0, 4).map((sk) => sk.name || sk.id || "skill"),
    confidence: extras.confidence ?? null,
    discovery: agent.discovery,
    sourceUrl: agent.sourceUrl,
    url: agent.url || null,
    price: extras.price,
    reputation: extras.reputation,
  };
}

/** Phase 0: search agents + propose a suggested team for an outcome. */
export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const preference = (body.preference || "best") as Preference;
  const plan = buildAccomplishPlan(body.goal, preference);

  const seats = plan.seats.map((s) => ({
    capability: s.capability,
    whySelected: s.whySelected,
    price: s.price,
    reputation: s.reputation,
    agent: s.match
      ? agentPayload(s.match.agent, {
          confidence: s.match.confidence,
          skillsOverride: s.match.agent.skills.slice(0, 4).map((sk) => sk.name || sk.id || "skill"),
          price: s.price,
          reputation: s.reputation,
        })
      : null,
  }));

  const results = plan.results.map((r) => ({
    ...agentPayload(r.agent, {
      confidence: r.confidence,
      skillsOverride: r.matchedSkills.length
        ? r.matchedSkills
        : r.agent.skills.slice(0, 3).map((s) => s.name || s.id || "skill"),
      price: r.price,
      reputation: r.reputation,
    }),
    snippet: r.snippet,
  }));

  return NextResponse.json({
    goal: plan.goal,
    preference: plan.preference,
    scanned: plan.scanned,
    capabilities: plan.capabilities,
    seats,
    results,
    estimatedLabel: plan.estimatedLabel,
    monthlyLabel: plan.monthlyLabel,
  });
}
