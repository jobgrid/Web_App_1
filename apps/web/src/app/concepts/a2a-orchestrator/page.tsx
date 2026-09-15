import type { Metadata } from "next";
import A2AOrchestratorClient from "@/components/concepts/a2a-orchestrator-client";
import { getSeededCards } from "@/lib/a2a/crawl";

export const metadata: Metadata = {
  title: "A2A Agent Orchestrator · JobGrid concept",
  description:
    "Google-for-agents orchestration: rank up to 50 A2A Agent Cards and route each request to the best suited agent.",
};

export const dynamic = "force-dynamic";

export default function A2AOrchestratorPage() {
  const cards = getSeededCards().slice(0, 50).map((c) => ({
    name: c.name,
    description: c.description,
    discovery: c.discovery,
    skills: c.skills.map((s) => s.name || s.id || "skill"),
    provider: c.provider?.organization || null,
  }));

  return <A2AOrchestratorClient catalog={cards} />;
}
