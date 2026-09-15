import type { DiscoveredAgentCard, A2ASkill } from "./types";

function asSkills(raw: unknown): A2ASkill[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((s) => {
    if (typeof s === "string") return { name: s };
    if (s && typeof s === "object") {
      const o = s as Record<string, unknown>;
      return {
        id: typeof o.id === "string" ? o.id : undefined,
        name: typeof o.name === "string" ? o.name : typeof o.id === "string" ? o.id : undefined,
        description: typeof o.description === "string" ? o.description.slice(0, 220) : undefined,
        tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string").slice(0, 6) : [],
      };
    }
    return { name: "skill" };
  });
}

function asCapabilities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).slice(0, 10);
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .slice(0, 10);
  }
  return [];
}

function discoveryFromUrl(url: string): DiscoveredAgentCard["discovery"] {
  if (url.includes("samples/")) return "sample";
  if (url.includes("raw.githubusercontent.com") || url.includes("github.com")) return "github";
  if (url.includes("/.well-known/")) return "well-known";
  if (url.includes("a2a-registry") || url.includes("a2aregistry.org")) return "registry";
  return "unknown";
}

export function normalizeAgentCard(
  card: Record<string, unknown>,
  sourceUrl: string
): DiscoveredAgentCard | null {
  const name = typeof card.name === "string" ? card.name : typeof card.id === "string" ? card.id : null;
  if (!name) return null;

  const providerRaw = card.provider;
  let provider: DiscoveredAgentCard["provider"] = null;
  if (providerRaw && typeof providerRaw === "object") {
    const p = providerRaw as Record<string, unknown>;
    provider = {
      organization:
        (typeof p.organization === "string" && p.organization) ||
        (typeof p.name === "string" && p.name) ||
        undefined,
      url: typeof p.url === "string" ? p.url : undefined,
    };
  } else if (typeof providerRaw === "string") {
    provider = { organization: providerRaw };
  }

  return {
    name,
    description: typeof card.description === "string" ? card.description : "",
    version: typeof card.version === "string" ? card.version : null,
    protocolVersion:
      (typeof card.protocolVersion === "string" && card.protocolVersion) ||
      (typeof card.specVersion === "string" && card.specVersion) ||
      null,
    url: typeof card.url === "string" ? card.url : "",
    documentationUrl:
      (typeof card.documentationUrl === "string" && card.documentationUrl) ||
      (typeof card.documentation_url === "string" && card.documentation_url) ||
      null,
    preferredTransport: typeof card.preferredTransport === "string" ? card.preferredTransport : null,
    provider,
    skills: asSkills(card.skills),
    capabilities: asCapabilities(card.capabilities),
    sourceUrl,
    discovery: discoveryFromUrl(sourceUrl),
    status: "live",
  };
}
