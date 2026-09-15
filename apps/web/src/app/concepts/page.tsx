import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "A2A concepts",
  description: "JobGrid A2A Agent Card registry and orchestrator concepts.",
};

export default function ConceptsIndexPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", fontFamily: "Georgia, serif" }}>
      <p style={{ letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: "#5c635e" }}>
        JobGrid · A2A protocol
      </p>
      <h1 style={{ fontSize: 36, margin: "8px 0 16px" }}>AI agent concepts</h1>
      <p style={{ fontSize: 18, lineHeight: 1.5, color: "#3a403c" }}>
        Search published Agent Cards, then route a request to the best-suited agent.
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, marginTop: 28 }}>
        <li>
          <Link href="/concepts/accomplish" style={{ color: "#0f7a5a", fontSize: 18 }}>
            Accomplish (Phase 0) →
          </Link>
        </li>
        <li>
          <Link href="/concepts/a2a-registry" style={{ color: "#0f7a5a", fontSize: 18 }}>
            Agent Card registry →
          </Link>
        </li>
        <li>
          <Link href="/concepts/a2a-orchestrator" style={{ color: "#0f7a5a", fontSize: 18 }}>
            Agent orchestrator (dev) →
          </Link>
        </li>
        <li>
          <a href="/.well-known/agent-card.json" style={{ color: "#0f7a5a", fontSize: 18 }}>
            JobGrid agent card JSON →
          </a>
        </li>
      </ul>
    </main>
  );
}
