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
};

export type CrawlResult = {
  crawledAt: string;
  ok: number;
  failed: number;
  cards: DiscoveredAgentCard[];
};
