"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CrawlResult, DiscoveredAgentCard } from "@/lib/a2a/types";
import styles from "./a2a-registry.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
};

function discoveryLabel(d: DiscoveredAgentCard["discovery"]) {
  switch (d) {
    case "well-known":
      return "/.well-known";
    case "github":
      return "GitHub";
    case "sample":
      return "Sample";
    case "registry":
      return "Registry";
    default:
      return "Other";
  }
}

function discoveryClass(d: DiscoveredAgentCard["discovery"]) {
  if (d === "github") return styles.badgeGithub;
  if (d === "sample") return styles.badgeSample;
  return undefined;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function isChatable(card: DiscoveredAgentCard) {
  if (!card.url) return false;
  try {
    const host = new URL(card.url).host;
    return host === "a2a-inspector.davidcjw.com" || host === "openagreements.org";
  } catch {
    return false;
  }
}

export default function A2ARegistryClient({
  initial,
}: {
  initial: CrawlResult & { mode?: string };
}) {
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [chatAgent, setChatAgent] = useState<DiscoveredAgentCard | null>(null);
  const [chatInput, setChatInput] = useState("Reverse: hello from JobGrid");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.cards;
    return data.cards.filter((c) => {
      const hay = [
        c.name,
        c.description,
        c.provider?.organization || "",
        ...c.skills.map((s) => `${s.name || ""} ${s.description || ""}`),
        ...c.capabilities,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data.cards, query]);

  const recrawl = (mode: "live" | "seed") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/concepts/a2a/crawl?mode=${mode}&limit=50`);
        const json = await res.json();
        if (!res.ok && json.error) throw new Error(json.error);
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Crawl failed");
      }
    });
  };

  const openChat = (card: DiscoveredAgentCard) => {
    setChatAgent(card);
    setChatError(null);
    const isOpenAgreements = (card.url || "").includes("openagreements.org");
    setMessages([
      {
        id: "welcome",
        role: "agent",
        text: isOpenAgreements
          ? `Hi — I'm ${card.name}. Ask what I can do, or try “Find a mutual NDA” / “List templates”.`
          : `Hi — I'm ${card.name}. Try skills like “Reverse: …” or “Shout: …” over A2A message/send.`,
      },
    ]);
    setChatInput(
      isOpenAgreements
        ? "What skills do you have and what can you do?"
        : "Reverse: hello from JobGrid"
    );
  };

  const sendChat = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!chatAgent?.url || !chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatBusy(true);
    setChatError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await fetch("/api/concepts/a2a/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentUrl: chatAgent.url,
          agentName: chatAgent.name,
          text,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Chat failed (${res.status})`);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "agent",
          text: String(json.reply || "(empty)"),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Concept · A2A protocol</p>
          <h1>Agent Card registry</h1>
          <p className={styles.lead}>
            Agents publish a digital business card at{" "}
            <code>/.well-known/agent-card.json</code>. JobGrid crawls those cards —
            from live domains and GitHub — so hiring and workplace agents can discover each
            other (A2A). Chat works with the Echo demo and{" "}
            <strong>OpenAgreements</strong> (legal templates).
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={pending}
              onClick={() => recrawl("live")}
            >
              {pending ? "Crawling…" : "Re-crawl live cards"}
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={pending}
              onClick={() => recrawl("seed")}
            >
              Show seeded snapshot
            </button>
            <a
              className={`${styles.btn} ${styles.btnGhost}`}
              href="https://a2a-protocol.org/latest/topics/agent-discovery/"
              target="_blank"
              rel="noreferrer"
            >
              A2A discovery docs
            </a>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/concepts/accomplish">
              Accomplish (Phase 0)
            </Link>
            <Link className={`${styles.btn} ${styles.btnGhost}`} href="/concepts/a2a-orchestrator">
              Orchestrator (dev)
            </Link>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
        <aside className={styles.stats}>
          <div>
            <span className={styles.statNum}>{data.cards.length}</span>
            <span className={styles.statLabel}>cards shown</span>
          </div>
          <div>
            <span className={styles.statNum}>{data.ok}</span>
            <span className={styles.statLabel}>live OK</span>
          </div>
          <div>
            <span className={styles.statNum}>{data.failed ?? 0}</span>
            <span className={styles.statLabel}>failed fetches</span>
          </div>
          <p className={styles.meta}>
            Last crawl {new Date(data.crawledAt).toLocaleString()} · mode{" "}
            <strong>{data.mode || "seed"}</strong>
          </p>
        </aside>
      </header>

      <div className={styles.toolbar}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by skill, provider, name…"
          className={styles.search}
          aria-label="Filter agent cards"
        />
        <p className={styles.hint}>
          Discovery paths: well-known URI · curated registry · GitHub{" "}
          <code>.well-known/agent-card.json</code>
        </p>
      </div>

      <section className={styles.grid} aria-live="polite">
        {filtered.map((card) => (
          <article key={`${card.name}-${card.sourceUrl}`} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.avatar} aria-hidden>
                {initials(card.name)}
              </div>
              <div className={styles.cardTitles}>
                <h2>{card.name}</h2>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${discoveryClass(card.discovery) || ""}`}>
                    {discoveryLabel(card.discovery)}
                  </span>
                  {card.protocolVersion ? (
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>
                      A2A {card.protocolVersion}
                    </span>
                  ) : null}
                  {isChatable(card) ? (
                    <span className={`${styles.badge} ${styles.badgeLive}`}>chatable</span>
                  ) : null}
                  {card.status === "cached" ? (
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>cached</span>
                  ) : null}
                  {card.status === "live" ? (
                    <span className={`${styles.badge} ${styles.badgeLive}`}>live</span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className={styles.desc}>{card.description || "No description in card."}</p>

            {card.provider?.organization ? (
              <p className={styles.provider}>
                Provider{" "}
                {card.provider.url ? (
                  <a href={card.provider.url} target="_blank" rel="noreferrer">
                    {card.provider.organization}
                  </a>
                ) : (
                  <strong>{card.provider.organization}</strong>
                )}
              </p>
            ) : null}

            {card.skills.length > 0 ? (
              <div className={styles.skills}>
                <h3>Skills</h3>
                <ul>
                  {card.skills.slice(0, 4).map((s, i) => (
                    <li key={`${s.id || s.name}-${i}`}>
                      <strong>{s.name || s.id || "Skill"}</strong>
                      {s.description ? <span>{s.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={styles.emptySkills}>No skills listed on this card.</p>
            )}

            {card.capabilities.length > 0 ? (
              <div className={styles.caps}>
                {card.capabilities.slice(0, 5).map((c) => (
                  <span key={c} className={styles.cap}>
                    {c}
                  </span>
                ))}
              </div>
            ) : null}

            <footer className={styles.foot}>
              {isChatable(card) ? (
                <button
                  type="button"
                  className={styles.chatBtn}
                  onClick={() => openChat(card)}
                  data-testid={`chat-${card.name}`}
                >
                  Chat with agent
                </button>
              ) : card.url ? (
                <a href={card.url} target="_blank" rel="noreferrer">
                  Endpoint
                </a>
              ) : (
                <span className={styles.dim}>No endpoint URL</span>
              )}
              <a href={card.sourceUrl} target="_blank" rel="noreferrer">
                View card JSON
              </a>
              {card.preferredTransport ? (
                <span className={styles.dim}>{card.preferredTransport}</span>
              ) : null}
            </footer>
          </article>
        ))}
      </section>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No cards match that filter.</p>
      ) : null}

      <section className={styles.howto}>
        <h2>How detection works</h2>
        <ol>
          <li>
            Fetch <code>https://{"{domain}"}/.well-known/agent-card.json</code> (RFC 8615).
          </li>
          <li>
            Also scan public GitHub repos that ship <code>.well-known/agent-card.json</code>.
          </li>
          <li>Normalize identity, skills, capabilities, transport, and provider.</li>
          <li>Surface them here as a curated registry concept for JobGrid A2A.</li>
        </ol>
        <p>
          JobGrid also publishes a concept card at <code>/.well-known/agent-card.json</code> on
          this app. Demo chat uses A2A JSON-RPC <code>message/send</code>.
        </p>
      </section>

      {chatAgent ? (
        <div className={styles.chatOverlay} role="dialog" aria-label={`Chat with ${chatAgent.name}`}>
          <div className={styles.chatPanel}>
            <header className={styles.chatHeader}>
              <div>
                <p className={styles.chatEyebrow}>A2A live chat</p>
                <h2>{chatAgent.name}</h2>
              </div>
              <button type="button" className={styles.btn} onClick={() => setChatAgent(null)}>
                Close
              </button>
            </header>
            <div className={styles.chatLog}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? styles.bubbleUser : styles.bubbleAgent}
                >
                  <span className={styles.bubbleRole}>{m.role === "user" ? "You" : chatAgent.name}</span>
                  <p>{m.text}</p>
                </div>
              ))}
              {chatBusy ? <p className={styles.chatBusy}>Waiting for agent…</p> : null}
              {chatError ? <p className={styles.error}>{chatError}</p> : null}
            </div>
            <form className={styles.chatForm} onSubmit={(e) => void sendChat(e)}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder='Try “Reverse: hello” or “Shout: agents”'
                className={styles.chatInput}
                disabled={chatBusy}
                aria-label="Message to agent"
              />
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={chatBusy || !chatInput.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
