"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./a2a-orchestrator.module.css";

type CatalogItem = {
  name: string;
  description: string;
  discovery: string;
  skills: string[];
  provider: string | null;
};

type Match = {
  agent: {
    name: string;
    description: string;
    skills: Array<{ name?: string; id?: string }>;
    provider?: { organization?: string } | null;
  };
  score: number;
  confidence: number;
  matchedSkills: string[];
  executable: "a2a" | "mcp" | "local" | null;
};

type Step = { id: string; label: string; status: string; meta?: string };

type OrchestratePayload = {
  query: string;
  scanned: number;
  shortlist: Match[];
  winner: Match;
  executed: boolean;
  executionMode: string;
  reply: string | null;
  steps: Step[];
  note?: string;
  error?: string;
};

const EXAMPLES = [
  "Find a mutual NDA template for a SaaS vendor",
  "Review this PR for OWASP risks and dependency CVEs",
  "Explain overtime lines on an Australian payslip",
  "Reverse: orchestration mesh online",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export default function A2AOrchestratorClient({ catalog }: { catalog: CatalogItem[] }) {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "scanning" | "ranking" | "routing" | "done">("idle");
  const [scanIndex, setScanIndex] = useState(0);
  const [result, setResult] = useState<OrchestratePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const nodes = useMemo(() => {
    return catalog.map((c, i) => {
      const angle = (i / catalog.length) * Math.PI * 2;
      const ring = 0.55 + (i % 3) * 0.14;
      return {
        ...c,
        x: 50 + Math.cos(angle) * 42 * ring,
        y: 50 + Math.sin(angle) * 42 * ring,
        delay: (i % 12) * 0.05,
      };
    });
  }, [catalog]);

  useEffect(() => {
    if (phase !== "scanning") return;
    setScanIndex(0);
    const id = window.setInterval(() => {
      setScanIndex((n) => (n + 1) % Math.max(catalog.length, 1));
    }, 45);
    return () => window.clearInterval(id);
  }, [phase, catalog.length]);

  useEffect(() => {
    if (!result?.shortlist?.length) return;
    const names = result.shortlist.map((m) => m.agent.name);
    let i = 0;
    setHighlight(names[0] || null);
    const id = window.setInterval(() => {
      i = (i + 1) % names.length;
      setHighlight(names[i] || null);
    }, 380);
    const stop = window.setTimeout(() => {
      window.clearInterval(id);
      setHighlight(result.winner.agent.name);
    }, Math.min(2200, names.length * 380));
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [result]);

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPhase("scanning");

    const scanMs = 900;
    const rankMs = 500;
    await new Promise((r) => setTimeout(r, scanMs));
    setPhase("ranking");
    await new Promise((r) => setTimeout(r, rankMs));
    setPhase("routing");

    try {
      const res = await fetch("/api/concepts/a2a/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = (await res.json()) as OrchestratePayload;
      if (!res.ok) throw new Error(json.error || "Orchestration failed");
      setResult(json);
      setPhase("done");
      setHighlight(json.winner.agent.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orchestration failed");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  };

  const scanningName = catalog[scanIndex]?.name;

  return (
    <div className={styles.shell}>
      <div className={styles.bgGrid} aria-hidden />
      <header className={styles.top}>
        <div>
          <p className={styles.brand}>JobGrid</p>
          <h1 className={styles.title}>Agent Orchestrator</h1>
          <p className={styles.sub}>
            Google for agents — scan up to {catalog.length} A2A Agent Cards, rank by skills, route to the
            best suited agent, then execute when callable.
          </p>
        </div>
        <div className={styles.topLinks}>
          <Link href="/concepts/a2a-registry" className={styles.linkBtn}>
            Card registry
          </Link>
          <span className={styles.pill}>{catalog.length} agents connected</span>
        </div>
      </header>

      <form className={styles.search} onSubmit={run}>
        <label className={styles.searchLabel} htmlFor="orch-q">
          Ask the mesh
        </label>
        <div className={styles.searchRow}>
          <input
            id="orch-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Find a mutual NDA template for a SaaS vendor"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !query.trim()}>
            {busy ? "Routing…" : "Orchestrate"}
          </button>
        </div>
        <div className={styles.examples}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className={styles.chip}
              disabled={busy}
              onClick={() => setQuery(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <div className={styles.stage}>
        <section className={styles.mesh} aria-label="Agent mesh">
          <div className={`${styles.radar} ${phase === "scanning" ? styles.radarActive : ""}`} />
          {nodes.map((n) => {
            const isWinner = result?.winner.agent.name === n.name;
            const isShort =
              !!result?.shortlist?.some((m) => m.agent.name === n.name) ||
              (phase === "scanning" && scanningName === n.name);
            const isHi = highlight === n.name;
            return (
              <div
                key={n.name}
                className={[
                  styles.node,
                  isShort ? styles.nodeHot : "",
                  isWinner ? styles.nodeWin : "",
                  isHi ? styles.nodePulse : "",
                ].join(" ")}
                style={{ left: `${n.x}%`, top: `${n.y}%`, animationDelay: `${n.delay}s` }}
                title={n.name}
              >
                <span>{initials(n.name)}</span>
              </div>
            );
          })}
          <div className={styles.meshCaption}>
            {phase === "idle" && "Mesh idle — submit a request to scan all agents"}
            {phase === "scanning" && `Scanning… ${scanningName || ""}`}
            {phase === "ranking" && "Ranking skills & tags…"}
            {phase === "routing" && "Calling winning agent…"}
            {phase === "done" && result && `Routed to ${result.winner.agent.name}`}
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Live route</h2>
          {!result && !error && (
            <p className={styles.muted}>
              Try a legal-template ask (NDA) or a secure code review — the orchestrator picks among{" "}
              {catalog.length} cards.
            </p>
          )}
          {error && <p className={styles.err}>{error}</p>}

          {result && (
            <>
              <ol className={styles.steps}>
                {result.steps.map((s) => (
                  <li key={s.id}>
                    <strong>{s.label}</strong>
                    {s.meta ? <span>{s.meta}</span> : null}
                  </li>
                ))}
              </ol>

              <div className={styles.winner}>
                <div className={styles.winnerHead}>
                  <div className={styles.avatar}>{initials(result.winner.agent.name)}</div>
                  <div>
                    <p className={styles.winnerName}>{result.winner.agent.name}</p>
                    <p className={styles.winnerMeta}>
                      {result.winner.confidence}% confidence · {result.executionMode}
                      {result.winner.matchedSkills[0] ? ` · ${result.winner.matchedSkills[0]}` : ""}
                    </p>
                  </div>
                </div>
                <p className={styles.winnerDesc}>{result.winner.agent.description}</p>
              </div>

              <h3 className={styles.listTitle}>Shortlist</h3>
              <ul className={styles.shortlist}>
                {result.shortlist.map((m, idx) => (
                  <li key={m.agent.name} className={idx === 0 ? styles.shortTop : undefined}>
                    <div className={styles.shortRow}>
                      <span className={styles.rank}>#{idx + 1}</span>
                      <span className={styles.shortName}>{m.agent.name}</span>
                      <span className={styles.conf}>{m.confidence}%</span>
                    </div>
                    <div className={styles.bar}>
                      <i style={{ width: `${m.confidence}%` }} />
                    </div>
                    <div className={styles.tags}>
                      {m.executable && <em>{m.executable}</em>}
                      {m.matchedSkills.slice(0, 2).map((s) => (
                        <em key={s}>{s}</em>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              {result.note && <p className={styles.note}>{result.note}</p>}

              {result.reply && (
                <div className={styles.reply}>
                  <h3>Agent reply</h3>
                  <pre>{result.reply}</pre>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
