export type A2ASkill = {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
};

export type A2AProvider = {
  organization?: string;
  url?: string;
};

export type QcCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type QualityReport = {
  /** Protocol ping passed, or local catalog handler. Required to Connect. */
  passed: boolean;
  /** Valid public card + public endpoint — candidate for marketplace. */
  listable: boolean;
  protocolOk: boolean;
  grade: "pass" | "card_only" | "fail" | "local";
  checks: QcCheck[];
  testedAt: string;
};

export type DiscoveredAgentCard = {
  name: string;
  description: string;
  version?: string | null;
  protocolVersion?: string | null;
  url?: string;
  documentationUrl?: string | null;
  preferredTransport?: string | null;
  provider?: A2AProvider | null;
  skills: A2ASkill[];
  capabilities: string[];
  sourceUrl: string;
  discovery: "well-known" | "github" | "sample" | "registry" | "unknown";
  status?: "live" | "cached" | "error";
  error?: string;
  qc?: QualityReport;
  listed?: boolean;
  github?: { owner: string; repo: string; htmlUrl: string };
};

export type CrawlResult = {
  crawledAt: string;
  ok: number;
  failed: number;
  cards: DiscoveredAgentCard[];
  githubHits?: number;
  listed?: number;
  qcPassed?: number;
};
