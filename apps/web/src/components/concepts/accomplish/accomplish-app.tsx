"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./accomplish.module.css";
import { AgentMark, Stars, VerifiedBadge } from "./agent-mark";

type Preference = "best" | "free" | "fastest" | "quality";
type Phase = "home" | "morphing" | "results" | "workspace";
type SortKey = "relevance" | "rating" | "jobs" | "used" | "popular";
type ResultsTab = "agents" | "all" | "skills" | "providers";

type Reputation = {
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  jobsCompleted: number;
  timesUsed: number;
  iconKey: string;
  source: "mock";
};

type Price = { tier: string; label: string; monthlyLabel: string; source: "mock" };

type QcCheck = { id: string; label: string; ok: boolean; detail: string };
type QcReport = {
  passed: boolean;
  listable: boolean;
  protocolOk: boolean;
  grade: string;
  checks: QcCheck[];
};

type SeatAgent = {
  name: string;
  description: string;
  provider: string | null;
  skills: string[];
  confidence: number | null;
  discovery: string;
  sourceUrl: string;
  url: string | null;
  price?: Price;
  reputation?: Reputation | null;
  qc?: QcReport | null;
  github?: { owner: string; repo: string; htmlUrl: string } | null;
};

type Seat = {
  capability: { id: string; label: string; why: string };
  whySelected: string;
  price: Price;
  reputation: Reputation | null;
  agent: SeatAgent | null;
};

type ResultHit = {
  name: string;
  description: string;
  provider: string | null;
  skills: string[];
  confidence: number;
  discovery: string;
  sourceUrl: string;
  url: string | null;
  snippet: string;
  price: Price;
  reputation: Reputation;
  qc?: QcReport | null;
  github?: { owner: string; repo: string; htmlUrl: string } | null;
};

type Plan = {
  goal: string;
  scanned: number;
  capabilities: Array<{ id: string; label: string }>;
  seats: Seat[];
  results: ResultHit[];
  estimatedLabel: string;
  monthlyLabel: string;
};

type ChatPeer = { name: string; iconKey: string };
type ChatMessage = { role: "system" | "user" | "assistant"; text: string };
type ChatThread = {
  id: string;
  title: string;
  pinned?: boolean;
  kind: "agent" | "team";
  peers: ChatPeer[];
  messages: ChatMessage[];
};

const EXAMPLES = [
  "Find 50 dental practices in Sydney and create an email marketing campaign for them",
  "Research my competitors and summarise the gaps",
  "Create a marketing campaign for our new payroll feature",
  "Analyse my business leave policy and draft a clearer version",
];

const SEED_THREADS: ChatThread[] = [
  {
    id: "team:sydney-dental",
    title: "Sydney dental campaign team",
    pinned: true,
    kind: "team",
    peers: [
      { name: "CRM Scout", iconKey: "orbit" },
      { name: "Email Composer", iconKey: "bolt" },
      { name: "Marketing Brief Agent", iconKey: "spark" },
    ],
    messages: [
      {
        role: "assistant",
        text: "Team ready — Research, leads, and outreach specialists are linked for your Sydney dental campaign.",
      },
    ],
  },
  {
    id: "agent:Research Librarian",
    title: "Research Librarian",
    pinned: true,
    kind: "agent",
    peers: [{ name: "Research Librarian", iconKey: "leaf" }],
    messages: [
      { role: "assistant", text: "Hi — I'm Research Librarian. Ask me for a cited brief anytime." },
    ],
  },
  {
    id: "agent:Payroll Copilot",
    title: "Payroll Copilot",
    kind: "agent",
    peers: [{ name: "Payroll Copilot", iconKey: "hex" }],
    messages: [{ role: "assistant", text: "Ready to explain payslips and cutoffs." }],
  },
  {
    id: "agent:Code Guardian",
    title: "Code Guardian",
    kind: "agent",
    peers: [{ name: "Code Guardian", iconKey: "pulse" }],
    messages: [{ role: "assistant", text: "Send a diff and I’ll review for risk." }],
  },
];

function ThreadIcons({ peers, size = 28 }: { peers: ChatPeer[]; size?: number }) {
  if (peers.length <= 1) {
    const p = peers[0] || { name: "A", iconKey: "orbit" };
    return <AgentMark iconKey={p.iconKey} label={p.name} size={size} />;
  }
  const shown = peers.slice(0, 3);
  return (
    <span className={styles.threadIconStack} style={{ width: size + (shown.length - 1) * 10, height: size }}>
      {shown.map((p, i) => (
        <span key={p.name} className={styles.threadIconLayer} style={{ left: i * 10, zIndex: shown.length - i }}>
          <AgentMark iconKey={p.iconKey} label={p.name} size={size - 2} />
        </span>
      ))}
    </span>
  );
}

function hostLabel(url: string | null, sourceUrl: string) {
  try {
    if (url) return new URL(url).host.replace(/^www\./, "");
  } catch {
    /* ignore */
  }
  try {
    return new URL(sourceUrl).host.replace(/^www\./, "");
  } catch {
    return "agent network";
  }
}

function formatUsed(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

function usedLabel(timesUsed: number, jobsCompleted: number) {
  const n = Math.max(timesUsed || 0, jobsCompleted || 0);
  if (n <= 0) return "Not used yet";
  return `Used ×${formatUsed(n)}`;
}

export default function AccomplishApp({ catalog }: { catalog: Array<{ name: string }> }) {
  /** Phase 0: show logged-in chrome for review. */
  const [loggedIn, setLoggedIn] = useState(true);
  const [phase, setPhase] = useState<Phase>("home");
  const [goal, setGoal] = useState("");
  const [preference, setPreference] = useState<Preference>("best");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResultHit | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerReason, setRegisterReason] = useState<"nav" | "hire">("nav");
  const [chatInput, setChatInput] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>(SEED_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [connectedNames, setConnectedNames] = useState<Set<string>>(
    () => new Set(["Research Librarian", "Payroll Copilot", "Code Guardian", "CRM Scout", "Email Composer"])
  );
  const [connectTarget, setConnectTarget] = useState<ResultHit | null>(null);
  const [connectAccepted, setConnectAccepted] = useState(false);
  const [qcStatus, setQcStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [qcReport, setQcReport] = useState<QcReport | null>(null);
  const [qcError, setQcError] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterFree, setFilterFree] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("agents");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase === "home") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!connectTarget) return;
    let cancelled = false;
    const target = connectTarget;
    void (async () => {
      try {
        const res = await fetch("/api/concepts/a2a/qc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: target.name,
            sourceUrl: target.sourceUrl || undefined,
            url: target.url || undefined,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok && !json.checks) {
          throw new Error(json.error || `QC failed (${res.status})`);
        }
        const report = json as QcReport;
        setQcReport(report);
        setQcStatus(report.passed ? "passed" : "failed");
      } catch (err) {
        if (cancelled) return;
        setQcStatus("failed");
        setQcError(err instanceof Error ? err.message : "QC failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connectTarget]);

  const visibleResults = useMemo(() => {
    if (!plan) return [];
    let list = [...plan.results];
    if (filterVerified) list = list.filter((r) => r.reputation.verified);
    if (filterFree) list = list.filter((r) => r.price.tier === "free");
    list.sort((a, b) => {
      if (sortBy === "rating") return (b.reputation.rating || 0) - (a.reputation.rating || 0);
      if (sortBy === "jobs") return b.reputation.jobsCompleted - a.reputation.jobsCompleted;
      if (sortBy === "used" || sortBy === "popular") return b.reputation.timesUsed - a.reputation.timesUsed;
      return b.confidence - a.confidence;
    });
    return list;
  }, [plan, filterVerified, filterFree, sortBy]);

  const sponsored = useMemo(() => {
    if (!plan) return [];
    return plan.results.filter((r) => r.reputation.verified).slice(0, 4);
  }, [plan]);

  const skillGroups = useMemo(() => {
    const map = new Map<string, { skill: string; agents: ResultHit[]; bestMatch: number }>();
    for (const r of visibleResults) {
      for (const skill of r.skills.length ? r.skills : ["General"]) {
        const key = skill.trim();
        if (!key) continue;
        const cur = map.get(key) || { skill: key, agents: [], bestMatch: 0 };
        cur.agents.push(r);
        cur.bestMatch = Math.max(cur.bestMatch, r.confidence);
        map.set(key, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.agents.length - a.agents.length || b.bestMatch - a.bestMatch);
  }, [visibleResults]);

  const providerGroups = useMemo(() => {
    const map = new Map<string, { provider: string; agents: ResultHit[]; bestMatch: number }>();
    for (const r of visibleResults) {
      const provider = (r.provider || "Independent").trim();
      const cur = map.get(provider) || { provider, agents: [], bestMatch: 0 };
      cur.agents.push(r);
      cur.bestMatch = Math.max(cur.bestMatch, r.confidence);
      map.set(provider, cur);
    }
    return [...map.values()].sort((a, b) => b.agents.length - a.agents.length || b.bestMatch - a.bestMatch);
  }, [visibleResults]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || null,
    [threads, activeThreadId]
  );
  const pinnedThreads = useMemo(() => threads.filter((t) => t.pinned), [threads]);
  const recentThreads = useMemo(() => threads.filter((t) => !t.pinned), [threads]);

  const openRegister = (reason: "nav" | "hire" = "nav") => {
    setRegisterReason(reason);
    setShowRegister(true);
  };

  const completeRegister = () => {
    setLoggedIn(true);
    setShowRegister(false);
  };

  const submit = async (e?: FormEvent, override?: string) => {
    e?.preventDefault();
    const g = (override ?? goal).trim();
    if (!g || phase === "morphing") return;
    setGoal(g);
    setError(null);
    setSelected(null);
    setPhase("morphing");
    setPlan(null);
    setFilterVerified(false);
    setFilterFree(false);
    setSortBy("relevance");
    setResultsTab("agents");
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const [json] = await Promise.all([
        fetch("/api/concepts/accomplish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: g, preference }),
          signal: ac.signal,
        }).then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || "Search failed");
          return body as Plan;
        }),
        // Let the morph + skeletons breathe
        wait(1800),
      ]);
      if (ac.signal.aborted) return;
      setPlan(json);
      setPhase("results");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("home");
    }
  };

  const isConnected = (name: string) => connectedNames.has(name);

  const openConnectModal = (hit: ResultHit) => {
    setConnectTarget(hit);
    setConnectAccepted(false);
    setQcStatus("running");
    setQcReport(hit.qc || null);
    setQcError(null);
  };

  const closeConnectModal = () => {
    setConnectTarget(null);
    setConnectAccepted(false);
    setQcStatus("idle");
    setQcReport(null);
    setQcError(null);
    setConnectBusy(false);
  };

  const confirmConnect = async () => {
    if (!connectTarget || !connectAccepted || qcStatus !== "passed") return;
    setConnectBusy(true);
    setQcError(null);
    try {
      const res = await fetch("/api/concepts/a2a/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: connectTarget.name,
          sourceUrl: connectTarget.sourceUrl || undefined,
          url: connectTarget.url || undefined,
          list: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.passed) {
        setQcReport(json.checks ? (json as QcReport) : qcReport);
        setQcStatus("failed");
        setQcError(json.error || "QC failed — not added to the marketplace");
        setConnectBusy(false);
        return;
      }
      const name = connectTarget.name;
      setConnectedNames((prev) => new Set(prev).add(name));
      setSelected(connectTarget);
      closeConnectModal();
    } catch (err) {
      setQcStatus("failed");
      setQcError(err instanceof Error ? err.message : "QC failed");
      setConnectBusy(false);
    }
  };

  const selectAgent = (hit: ResultHit) => {
    setSelected(hit);
  };

  const openChatWithAgent = (hit: ResultHit) => {
    if (!isConnected(hit.name)) {
      openConnectModal(hit);
      return;
    }
    const id = `agent:${hit.name}`;
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === id);
      if (existing) {
        return [existing, ...prev.filter((t) => t.id !== id)];
      }
      const next: ChatThread = {
        id,
        title: hit.name,
        kind: "agent",
        peers: [{ name: hit.name, iconKey: hit.reputation.iconKey }],
        messages: [
          {
            role: "assistant",
            text: `Hi — I'm ${hit.name}. Ready to help with “${goal || "your task"}”. What should we start with?`,
          },
        ],
      };
      return [next, ...prev];
    });
    setActiveThreadId(id);
    setSelected(hit);
    setChatInput("");
    setPhase("workspace");
  };

  const openThread = (id: string) => {
    const thread = threads.find((t) => t.id === id);
    if (thread?.kind === "agent" && thread.peers[0] && !isConnected(thread.peers[0].name)) {
      // Prototype: allow opening historical threads only if connected
      return;
    }
    setActiveThreadId(id);
    setChatInput("");
    setPhase("workspace");
  };

  const hireAgent = (agent?: ResultHit) => {
    const target = agent ?? selected;
    if (!target) return;
    setSelected(target);
    if (!loggedIn) {
      openRegister("hire");
      return;
    }
    if (!isConnected(target.name)) {
      openConnectModal(target);
      return;
    }
    openChatWithAgent(target);
  };

  const sendChat = (e?: FormEvent) => {
    e?.preventDefault();
    const t = chatInput.trim();
    if (!t || !activeThreadId) return;
    const replyName = activeThread?.peers[0]?.name || "the agent";
    const isTeam = activeThread?.kind === "team";
    const peerNames = activeThread?.peers.map((p) => p.name).join(", ") || replyName;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                { role: "user", text: t },
                {
                  role: "assistant",
                  text: isTeam
                    ? `Team noted — prototype reply from ${peerNames}.`
                    : `${replyName}: noted — prototype reply. Full execution comes later.`,
                },
              ],
            }
          : thread
      )
    );
    setChatInput("");
  };

  const goHome = () => {
    abortRef.current?.abort();
    setPhase("home");
    setPlan(null);
    setSelected(null);
    setError(null);
    setActiveThreadId(null);
  };

  const backToResults = () => {
    setPhase(plan ? "results" : "home");
  };

  const shellPhase = phase === "home" ? "home" : phase === "morphing" ? "morphing" : "results";

  return (
    <div className={`${styles.root} ${phase === "workspace" ? styles.phase_chat : styles[`phase_${shellPhase}`]}`}>
      {phase !== "workspace" && (
      <header className={styles.topShell}>
        {(phase === "morphing" || phase === "results") && (
          <button type="button" className={`${styles.logo} ${styles.logoEdge}`} onClick={goHome} aria-label="JobGrid home">
            JobGrid
          </button>
        )}

        {(phase === "morphing" || phase === "results") && (
          <div className={`${styles.authSlot} ${styles.authEdge}`}>
            {!loggedIn ? (
              <>
                <button type="button" className={styles.chromeLinkBtn} onClick={() => openRegister("nav")}>
                  Sign in
                </button>
                <button type="button" className={styles.registerBtn} onClick={() => openRegister("nav")}>
                  Register
                </button>
              </>
            ) : (
              <>
                <span className={styles.signedIn}>You</span>
                <button type="button" className={styles.avatar} onClick={() => setLoggedIn(false)} title="Sign out (prototype)">
                  J
                </button>
              </>
            )}
          </div>
        )}

        <div className={styles.topShellInner}>
          <div className={styles.cluster}>
            {phase === "home" && (
              <button type="button" className={styles.logo} onClick={goHome} aria-label="JobGrid home">
                JobGrid
              </button>
            )}

            {phase === "home" && <h1 className={styles.greeting}>What do you want to accomplish?</h1>}

            <form className={styles.searchPill} onSubmit={submit}>
              <span className={styles.plus} aria-hidden>
                +
              </span>
              <input
                ref={inputRef}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe anything you want to get done…"
                aria-label="What do you want to accomplish"
                disabled={phase === "morphing"}
              />
              <button
                type="submit"
                className={styles.searchGo}
                disabled={!goal.trim() || phase === "morphing"}
                onClick={(e) => void submit(e)}
              >
                {phase === "home" ? "Continue" : "Search"}
              </button>
            </form>
          </div>

          {(phase === "morphing" || phase === "results") && <div className={styles.searchRail} aria-hidden />}

          {phase === "home" && (
            <div className={styles.authSlot}>
              {!loggedIn ? (
                <>
                  <button type="button" className={styles.chromeLinkBtn} onClick={() => openRegister("nav")}>
                    Sign in
                  </button>
                  <button type="button" className={styles.registerBtn} onClick={() => openRegister("nav")}>
                    Register
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.signedIn}>You</span>
                  <button type="button" className={styles.avatar} onClick={() => setLoggedIn(false)} title="Sign out (prototype)">
                    J
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      )}

      {(phase === "home" || phase === "morphing" || phase === "results") && (
        <div className={styles.stage}>
          {phase === "home" && (
            <div className={styles.homeExtras}>
              <p className={styles.homeHint}>
                {loggedIn
                  ? "You’re signed in — search the network and chat with any agent."
                  : "You’re browsing as a guest — register free when you’re ready to hire agents."}
              </p>

              <div className={styles.prefRow} role="group" aria-label="Preferences">
                {(
                  [
                    ["best", "Best available"],
                    ["free", "Free only"],
                    ["fastest", "Fastest"],
                    ["quality", "Highest quality"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={preference === id ? styles.prefOn : styles.pref}
                    onClick={() => setPreference(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ul className={styles.suggestions}>
                {EXAMPLES.map((ex) => (
                  <li key={ex}>
                    <button type="button" onClick={() => void submit(undefined, ex)}>
                      <span className={styles.sugIcon} aria-hidden>
                        ⌕
                      </span>
                      {ex}
                    </button>
                  </li>
                ))}
              </ul>
              {error && <p className={styles.error}>{error}</p>}
              <p className={styles.homeFoot}>Searching {catalog.length} specialists in the agent network</p>
            </div>
          )}

          {(phase === "morphing" || phase === "results") && (
            <>
              <nav className={styles.tabs} aria-label="Result types">
                {(
                  [
                    ["agents", "Agents"],
                    ["all", "All"],
                    ["skills", "Skills"],
                    ["providers", "Providers"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={resultsTab === id ? styles.tabOn : styles.tab}
                    onClick={() => setResultsTab(id)}
                    disabled={phase === "morphing"}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className={styles.filters}>
                <button
                  type="button"
                  className={filterVerified ? styles.filterOn : styles.filterChip}
                  onClick={() => setFilterVerified((v) => !v)}
                  disabled={phase === "morphing"}
                >
                  ✓ Verified
                </button>
                <button
                  type="button"
                  className={filterFree ? styles.filterOn : styles.filterChip}
                  onClick={() => setFilterFree((v) => !v)}
                  disabled={phase === "morphing"}
                >
                  Free
                </button>
                <button
                  type="button"
                  className={sortBy === "popular" ? styles.filterOn : styles.filterChip}
                  onClick={() => setSortBy("popular")}
                  disabled={phase === "morphing"}
                >
                  Most popular
                </button>
                <button
                  type="button"
                  className={sortBy === "used" ? styles.filterOn : styles.filterChip}
                  onClick={() => setSortBy("used")}
                  disabled={phase === "morphing"}
                >
                  Most used
                </button>
                <label className={styles.sortLabel}>
                  Sort by
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    disabled={phase === "morphing"}
                  >
                    <option value="relevance">Best match</option>
                    <option value="rating">Highest rated</option>
                    <option value="used">Most used</option>
                  </select>
                </label>
              </div>

              <div className={styles.serpBody}>
                <section className={styles.resultsCol} aria-label="Agent results">
                  {phase === "morphing" && (
                    <>
                      <div className={styles.skelMeta} />
                      <ul className={styles.skelList} aria-label="Loading agents">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <li key={i} className={styles.skelItem} style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className={styles.skelCite}>
                              <i className={styles.skelDot} />
                              <span>
                                <i className={styles.skelLine} style={{ width: "38%" }} />
                                <i className={styles.skelLine} style={{ width: "52%" }} />
                              </span>
                            </div>
                            <i className={styles.skelTitle} />
                            <i className={styles.skelLine} style={{ width: "92%" }} />
                            <i className={styles.skelLine} style={{ width: "78%" }} />
                            <div className={styles.skelTags}>
                              <i />
                              <i />
                              <i />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {phase === "results" && plan && (
                    <>
                      <p className={styles.resultMeta}>
                        {resultsTab === "agents" && (
                          <>
                            About {visibleResults.length} agents
                            {filterVerified || filterFree ? " (filtered)" : ""} · scanned {plan.scanned} cards
                          </>
                        )}
                        {resultsTab === "all" && (
                          <>
                            All matching signals · {visibleResults.length} agents · {skillGroups.length} skills ·{" "}
                            {providerGroups.length} providers
                          </>
                        )}
                        {resultsTab === "skills" && (
                          <>
                            {skillGroups.length} skills across {visibleResults.length} agents
                          </>
                        )}
                        {resultsTab === "providers" && (
                          <>
                            {providerGroups.length} providers across {visibleResults.length} agents
                          </>
                        )}
                        {" · "}
                        {plan.capabilities.map((c) => c.label).join(" · ")}
                      </p>

                      {(resultsTab === "agents" || resultsTab === "all") && (
                        <section className={resultsTab === "all" ? styles.tabSection : undefined}>
                          {resultsTab === "all" && <h3 className={styles.tabSectionTitle}>Agents</h3>}
                          <ol className={styles.resultList}>
                            {(resultsTab === "all" ? visibleResults.slice(0, 5) : visibleResults).map((r) => {
                              const isActive = selected?.name === r.name;
                              return (
                                <li
                                  key={r.name}
                                  className={isActive ? `${styles.resultItem} ${styles.resultOn}` : styles.resultItem}
                                >
                                  <div
                                    className={styles.resultHit}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectAgent(r)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        selectAgent(r);
                                      }
                                    }}
                                  >
                                    <div className={styles.resultHoverActions}>
                                      {isConnected(r.name) ? (
                                        <button
                                          type="button"
                                          className={styles.chatHoverBtn}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openChatWithAgent(r);
                                          }}
                                        >
                                          Chat
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.connectHoverBtn}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openConnectModal(r);
                                          }}
                                        >
                                          Connect
                                        </button>
                                      )}
                                    </div>
                                    <p className={styles.resultCite}>
                                      <AgentMark iconKey={r.reputation.iconKey} label={r.name} size={28} />
                                      <span>
                                        <span className={styles.citeName}>
                                          {r.provider || r.name}
                                          {r.reputation.verified && (
                                            <>
                                              {" "}
                                              <VerifiedBadge />
                                            </>
                                          )}
                                          {isConnected(r.name) && <span className={styles.connectedBadge}>Connected</span>}
                                        </span>
                                        <span className={styles.citeUrl}>
                                          {hostLabel(r.url, r.sourceUrl)}
                                          {r.discovery === "github" ? " · GitHub" : ""}
                                          {r.qc?.grade === "pass" ? " · QC passed" : ""}
                                        </span>
                                      </span>
                                    </p>
                                    <span className={styles.resultTitle}>{r.name}</span>
                                    <p className={styles.resultSnippet}>{r.snippet}</p>
                                    <p className={styles.repRow}>
                                      {r.reputation.rating != null ? (
                                        <>
                                          <Stars rating={r.reputation.rating} />
                                          <strong>{r.reputation.rating.toFixed(1)}</strong>
                                          <span>({r.reputation.reviewCount})</span>
                                        </>
                                      ) : (
                                        <span>No ratings yet</span>
                                      )}
                                      <span className={styles.repDot}>·</span>
                                      <span>{usedLabel(r.reputation.timesUsed, r.reputation.jobsCompleted)}</span>
                                    </p>
                                    <p className={styles.resultTags}>
                                      <span className={r.price.tier === "free" ? styles.priceFree : styles.priceTask}>
                                        {r.price.tier === "unknown" ? "Pricing unknown" : `Est. ${r.price.label}`}
                                      </span>
                                      {r.skills.slice(0, 3).map((s) => (
                                        <span key={s}>{s}</span>
                                      ))}
                                      <span>{r.confidence}% match</span>
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                            {visibleResults.length === 0 && (
                              <li className={styles.emptyFilter}>No agents match these filters. Try clearing Verified or Free.</li>
                            )}
                          </ol>
                        </section>
                      )}

                      {(resultsTab === "skills" || resultsTab === "all") && (
                        <section className={resultsTab === "all" ? styles.tabSection : undefined}>
                          {resultsTab === "all" && <h3 className={styles.tabSectionTitle}>Skills</h3>}
                          <ol className={styles.resultList}>
                            {(resultsTab === "all" ? skillGroups.slice(0, 6) : skillGroups).map((g) => (
                              <li key={g.skill} className={styles.resultItem}>
                                <div className={styles.resultHit}>
                                  <p className={styles.groupKicker}>Skill</p>
                                  <p className={styles.resultTitle}>{g.skill}</p>
                                  <p className={styles.resultSnippet}>
                                    {g.agents.length} agent{g.agents.length === 1 ? "" : "s"} · best match {g.bestMatch}%
                                  </p>
                                  <p className={styles.resultTags}>
                                    {g.agents.slice(0, 4).map((a) => (
                                      <button
                                        key={a.name}
                                        type="button"
                                        className={styles.inlineAgentChip}
                                        onClick={() => {
                                          setResultsTab("agents");
                                          selectAgent(a);
                                        }}
                                      >
                                        {a.name}
                                      </button>
                                    ))}
                                  </p>
                                </div>
                              </li>
                            ))}
                            {skillGroups.length === 0 && (
                              <li className={styles.emptyFilter}>No skills found for this search.</li>
                            )}
                          </ol>
                        </section>
                      )}

                      {(resultsTab === "providers" || resultsTab === "all") && (
                        <section className={resultsTab === "all" ? styles.tabSection : undefined}>
                          {resultsTab === "all" && <h3 className={styles.tabSectionTitle}>Providers</h3>}
                          <ol className={styles.resultList}>
                            {(resultsTab === "all" ? providerGroups.slice(0, 6) : providerGroups).map((g) => (
                              <li key={g.provider} className={styles.resultItem}>
                                <div className={styles.resultHit}>
                                  <p className={styles.groupKicker}>Provider</p>
                                  <p className={styles.resultTitle}>{g.provider}</p>
                                  <p className={styles.resultSnippet}>
                                    {g.agents.length} agent{g.agents.length === 1 ? "" : "s"} · best match {g.bestMatch}%
                                  </p>
                                  <p className={styles.resultTags}>
                                    {g.agents.slice(0, 4).map((a) => (
                                      <button
                                        key={a.name}
                                        type="button"
                                        className={styles.inlineAgentChip}
                                        onClick={() => {
                                          setResultsTab("agents");
                                          selectAgent(a);
                                        }}
                                      >
                                        {a.name}
                                      </button>
                                    ))}
                                  </p>
                                </div>
                              </li>
                            ))}
                            {providerGroups.length === 0 && (
                              <li className={styles.emptyFilter}>No providers found for this search.</li>
                            )}
                          </ol>
                        </section>
                      )}
                    </>
                  )}
                </section>

                <aside className={styles.teamPanel} aria-label={selected ? "Selected agent" : "Sponsored"}>
                  {phase === "morphing" ? (
                    <div className={styles.skelPanel}>
                      <i className={styles.skelPanelTitle} />
                      <i className={styles.skelLine} style={{ width: "55%" }} />
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={styles.skelSeat}>
                          <i className={styles.skelDot} />
                          <span>
                            <i className={styles.skelLine} style={{ width: "40%" }} />
                            <i className={styles.skelLine} style={{ width: "70%" }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : selected ? (
                    <>
                      <h2>Selected</h2>
                      <p className={styles.panelSub}>{selected.provider || "Independent agent"}</p>
                      <div className={styles.agentHero} style={{ marginTop: 8 }}>
                        <AgentMark iconKey={selected.reputation.iconKey} label={selected.name} size={56} />
                        <div>
                          <p className={styles.teamName}>
                            {selected.name}
                            {selected.reputation.verified ? (
                              <>
                                {" "}
                                <VerifiedBadge />
                              </>
                            ) : null}
                            {isConnected(selected.name) && <span className={styles.connectedBadge}>Connected</span>}
                          </p>
                          <p className={styles.citeUrl}>{hostLabel(selected.url, selected.sourceUrl)}</p>
                        </div>
                      </div>
                      <p className={styles.agentDesc}>{selected.description}</p>
                      <p className={styles.repRow}>
                        {selected.reputation.rating != null ? (
                          <>
                            <Stars rating={selected.reputation.rating} />
                            <strong>{selected.reputation.rating.toFixed(1)}</strong>
                            <span>({selected.reputation.reviewCount})</span>
                          </>
                        ) : (
                          <span>No ratings yet</span>
                        )}
                        <span className={styles.repDot}>·</span>
                        <span>{usedLabel(selected.reputation.timesUsed, selected.reputation.jobsCompleted)}</span>
                      </p>
                      <div className={styles.taskPriceBox}>
                        <span>Estimated for this task</span>
                        <strong className={selected.price.tier === "free" ? styles.priceFree : undefined}>
                          {selected.price.label}
                        </strong>
                      </div>
                      <p className={styles.resultTags}>
                        <span>{selected.confidence}% match</span>
                      </p>
                      {isConnected(selected.name) ? (
                        <>
                          <button type="button" className={styles.startBtn} onClick={() => openChatWithAgent(selected)}>
                            Chat
                          </button>
                          <p className={styles.connectedHint}>Connected — chats may incur task charges.</p>
                        </>
                      ) : (
                        <button type="button" className={styles.startBtn} onClick={() => openConnectModal(selected)}>
                          Connect
                        </button>
                      )}
                      <button type="button" className={styles.chromeLinkBtn} style={{ marginTop: 12 }} onClick={() => setSelected(null)}>
                        Show sponsored
                      </button>
                    </>
                  ) : (
                    plan && (
                      <>
                        <h2>Sponsored</h2>
                        <p className={styles.panelSub}>Ads · Verified only</p>
                        <ul className={styles.teamList}>
                          {sponsored.map((r) => (
                            <li
                              key={r.name}
                              role="button"
                              tabIndex={0}
                              style={{ cursor: "pointer" }}
                              onClick={() => selectAgent(r)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  selectAgent(r);
                                }
                              }}
                            >
                              <AgentMark iconKey={r.reputation.iconKey} label={r.name} size={36} />
                              <div className={styles.teamInfo}>
                                <p className={styles.teamName}>
                                  {r.name} <VerifiedBadge />
                                </p>
                                <p className={styles.teamWhy}>{r.snippet}</p>
                                {r.reputation.rating != null && (
                                  <p className={styles.teamRep}>
                                    <Stars rating={r.reputation.rating} /> {r.reputation.rating.toFixed(1)} ·{" "}
                                    {usedLabel(r.reputation.timesUsed, r.reputation.jobsCompleted)}
                                  </p>
                                )}
                              </div>
                              <div className={styles.teamPrice}>
                                <span className={r.price.tier === "free" ? styles.priceFree : undefined}>
                                  {r.price.label}
                                </span>
                                <small>Est. for this task</small>
                              </div>
                            </li>
                          ))}
                          {sponsored.length === 0 && (
                            <li className={styles.emptyFilter}>No verified agents to sponsor yet.</li>
                          )}
                        </ul>
                        <p className={styles.mockNote}>Prototype ads — verified agents only</p>
                      </>
                    )
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      )}

      {phase === "workspace" && (
        <div className={styles.chatShell}>
          <aside className={styles.chatSidebar} aria-label="Chat history">
            <div className={styles.chatSideTop}>
              <button type="button" className={styles.chatBrand} onClick={goHome}>
                JobGrid
              </button>
              <button type="button" className={styles.backLink} onClick={backToResults}>
                ← Results
              </button>
            </div>

            <button type="button" className={styles.newChatBtn} disabled title="Coming next">
              + New chat
            </button>

            {pinnedThreads.length > 0 && (
              <div className={styles.chatSideSection}>
                <p className={styles.chatSideLabel}>Pinned</p>
                <ul className={styles.chatThreadList}>
                  {pinnedThreads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className={activeThreadId === t.id ? styles.chatThreadOn : styles.chatThread}
                        onClick={() => openThread(t.id)}
                      >
                        <ThreadIcons peers={t.peers} size={26} />
                        <span>
                          <strong>{t.title}</strong>
                          <small>{t.kind === "team" ? `${t.peers.length} agents` : "Agent"}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={styles.chatSideSection}>
              <p className={styles.chatSideLabel}>Recents</p>
              <ul className={styles.chatThreadList}>
                {recentThreads.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={activeThreadId === t.id ? styles.chatThreadOn : styles.chatThread}
                      onClick={() => openThread(t.id)}
                    >
                      <ThreadIcons peers={t.peers} size={26} />
                      <span>
                        <strong>{t.title}</strong>
                        <small>{t.kind === "team" ? `${t.peers.length} agents` : "Agent"}</small>
                      </span>
                    </button>
                  </li>
                ))}
                {recentThreads.length === 0 && <li className={styles.emptyFilter}>No recent chats yet.</li>}
              </ul>
            </div>

            <div className={styles.chatSideFoot}>
              <button type="button" className={styles.avatar} onClick={() => setLoggedIn(false)} title="Sign out (prototype)">
                J
              </button>
              <div>
                <strong>You</strong>
                <p>Signed in</p>
              </div>
            </div>
          </aside>

          <main className={styles.chatMain}>
            <header className={styles.chatMainTop}>
              <div className={styles.chatMainTitle}>
                {activeThread ? <ThreadIcons peers={activeThread.peers} size={32} /> : null}
                <div>
                  <h1>{activeThread?.title || "Chat"}</h1>
                  <p>
                    {activeThread?.kind === "team"
                      ? activeThread.peers.map((p) => p.name).join(" · ")
                      : activeThread?.peers[0]?.name || "Select a chat"}
                  </p>
                </div>
              </div>
            </header>

            <div className={styles.chatScroll}>
              <div className={styles.chatColumn}>
                {(activeThread?.messages || []).map((m, i) => (
                  <div key={i} className={m.role === "user" ? styles.msgUser : styles.msgBot}>
                    <pre>{m.text}</pre>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.chatAskWrap}>
              <form className={styles.chatAsk} onSubmit={sendChat}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    activeThread?.kind === "team"
                      ? "Ask the team…"
                      : `Ask ${activeThread?.peers[0]?.name || "agent"}…`
                  }
                  aria-label="Ask"
                />
                <button type="submit" className={styles.chatSend} disabled={!chatInput.trim() || !activeThread} aria-label="Send">
                  ↑
                </button>
              </form>
            </div>
          </main>
        </div>
      )}

      {connectTarget && (
        <div className={styles.modalScrim} role="presentation" onClick={closeConnectModal}>
          <div
            className={styles.connectModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.modalClose} onClick={closeConnectModal} aria-label="Close">
              ×
            </button>

            <div className={styles.connectHero}>
              <AgentMark iconKey={connectTarget.reputation.iconKey} label={connectTarget.name} size={52} />
              <div>
                <p className={styles.connectKicker}>Connect agent</p>
                <h2 id="connect-title">{connectTarget.name}</h2>
                <p className={styles.connectProvider}>
                  {connectTarget.provider || "Independent agent"}
                  {connectTarget.reputation.verified ? (
                    <>
                      {" "}
                      <VerifiedBadge />
                    </>
                  ) : (
                    <span className={styles.unverifiedPill}>Unverified</span>
                  )}
                </p>
              </div>
            </div>

            <section className={styles.connectSection}>
              <h3>Agent details</h3>
              <p>{connectTarget.description}</p>
              <p className={styles.connectMeta}>
                Est. for this task: <strong>{connectTarget.price.label}</strong>
                {" · "}
                {connectTarget.confidence}% match
                {connectTarget.skills.length > 0 ? ` · ${connectTarget.skills.slice(0, 3).join(" · ")}` : ""}
              </p>
              <p className={styles.connectMeta}>
                Source:{" "}
                <a href={connectTarget.sourceUrl} target="_blank" rel="noreferrer">
                  Agent Card
                </a>
              </p>
            </section>

            <section className={styles.connectSection}>
              <h3>Quality control</h3>
              <p className={styles.connectMeta}>
                {qcStatus === "running"
                  ? "Testing this Agent Card before it can be connected or listed…"
                  : qcStatus === "passed"
                    ? "Passed — this agent can be connected and added to the marketplace."
                    : qcStatus === "failed"
                      ? "Failed — it will not be added until these checks pass."
                      : "A live test is required before Connect."}
              </p>
              {qcError ? <p className={styles.connectMeta}>{qcError}</p> : null}
              {qcReport?.checks?.length ? (
                <ul className={styles.qcList}>
                  {qcReport.checks.map((c) => (
                    <li key={c.id} className={c.ok ? styles.qcOk : styles.qcFail}>
                      <span>{c.ok ? "Pass" : "Fail"}</span>
                      <span>
                        <strong>{c.label}</strong>
                        <em>{c.detail}</em>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {qcStatus === "failed" && (
              <div className={styles.connectWarn} role="alert">
                <strong>QC failed</strong>
                <p>
                  JobGrid did not add this agent to the marketplace. Fix the Agent Card or endpoint, then re-open
                  Connect to test again.
                </p>
              </div>
            )}

            {!connectTarget.reputation.verified && qcStatus !== "failed" && (
              <div className={styles.connectWarn} role="alert">
                <strong>Unverified agent</strong>
                <p>
                  This agent is not verified by JobGrid. Connecting and using it is at your own discretion. Review the
                  provider carefully before sharing data or authorizing charges.
                </p>
              </div>
            )}

            <div className={styles.connectWarnSoft} role="note">
              <strong>Before you connect</strong>
              <p>
                Connecting lets this agent run tasks and chat on your behalf. Estimated task costs may be charged when
                you start work in chat. You can disconnect later in settings (prototype).
              </p>
            </div>

            <section className={styles.connectSection}>
              <h3>Terms &amp; conditions</h3>
              <div className={styles.termsBox}>
                <p>
                  By connecting, you authorize JobGrid to invoke this agent for your requests, exchange task context with
                  its endpoint, and apply the agent’s estimated task pricing when work runs.
                </p>
                <p>
                  You remain responsible for prompts and outputs. Do not share secrets you are not allowed to disclose.
                  Usage may be logged for security and billing prototypes.
                </p>
                <p>
                  Unverified agents are third-party services. JobGrid does not warrant their quality, safety, or
                  compliance. Proceed only if you accept that risk.
                </p>
              </div>
            </section>

            <label className={styles.connectCheck}>
              <input
                type="checkbox"
                checked={connectAccepted}
                onChange={(e) => setConnectAccepted(e.target.checked)}
              />
              <span>I understand the risks and accept the terms for connecting {connectTarget.name}.</span>
            </label>

            <div className={styles.connectActions}>
              <button type="button" className={styles.btnGhost} onClick={closeConnectModal}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.startBtn}
                disabled={!connectAccepted || qcStatus !== "passed" || connectBusy}
                onClick={() => void confirmConnect()}
              >
                {connectBusy
                  ? "Listing…"
                  : qcStatus === "running"
                    ? "Testing…"
                    : qcStatus === "failed"
                      ? "Cannot connect"
                      : "Connect & list"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegister && (
        <div className={styles.modalScrim} role="presentation" onClick={() => setShowRegister(false)}>
          <div
            className={styles.fiverrModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.modalClose} onClick={() => setShowRegister(false)} aria-label="Close">
              ×
            </button>
            <div className={styles.fiverrLeft}>
              <h2>Success starts here</h2>
              <ul>
                <li>
                  <span>✓</span> Hire verified AI agents for real outcomes
                </li>
                <li>
                  <span>✓</span> Assemble specialist teams in seconds
                </li>
                <li>
                  <span>✓</span> Pay per task or run agents monthly
                </li>
              </ul>
              <div className={styles.fiverrArt} aria-hidden>
                <div className={styles.fiverrArtCard}>
                  <AgentMark iconKey="orbit" label="A" size={36} />
                  <div>
                    <strong>Agent network</strong>
                    <p>Research · Leads · Campaigns</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.fiverrRight}>
              <h3 id="register-title">Create a new account</h3>
              <p className={styles.fiverrSub}>
                Already have an account?{" "}
                <button type="button" className={styles.textLink} onClick={completeRegister}>
                  Sign in
                </button>
              </p>
              <p className={styles.fiverrReason}>
                {registerReason === "hire"
                  ? "Register free to hire this agent and start the task."
                  : "Register free to hire agents and save your teams."}
              </p>
              <button type="button" className={styles.socialBtn} onClick={completeRegister}>
                <span className={styles.gIcon} aria-hidden>
                  G
                </span>
                Continue with Google
              </button>
              <button type="button" className={styles.socialBtn} onClick={completeRegister}>
                <span className={styles.appleIcon} aria-hidden>
                  ⌘
                </span>
                Continue with Apple
              </button>
              <button type="button" className={styles.socialBtn} onClick={completeRegister}>
                <span className={styles.fbIcon} aria-hidden>
                  f
                </span>
                Continue with Facebook
              </button>
              <button type="button" className={styles.emailSignup} onClick={completeRegister}>
                Or sign up using email
              </button>
              <p className={styles.legal}>
                By joining, you agree to the <span>Terms of Service</span> and <span>Privacy Policy</span>.
              </p>
              <p className={styles.mockNote}>Prototype auth — no account is actually created.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
