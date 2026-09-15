import { inspectPublicHttpsUrl } from "./url-safety";

type RegistryAgent = {
  name?: string;
  wellKnownURI?: string;
  url?: string;
};

export async function discoverA2ARegistryCards(limit = 40): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 400 && urls.length < limit; offset += 100) {
    const res = await fetch(`https://a2aregistry.org/api/agents?limit=100&offset=${offset}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobGrid-A2A-QC/0.1 (+https://www.jobgrid.ai)",
      },
      cache: "no-store",
    });
    if (!res.ok) break;
    const json = (await res.json()) as { agents?: RegistryAgent[]; total?: number };
    const agents = json.agents || [];
    if (!agents.length) break;
    for (const agent of agents) {
      const uri = agent.wellKnownURI?.trim();
      if (!uri) continue;
      const inspected = inspectPublicHttpsUrl(uri);
      if (!inspected.ok) continue;
      const key = uri.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(uri);
      if (urls.length >= limit) break;
    }
    if (typeof json.total === "number" && offset + agents.length >= json.total) break;
  }
  return urls;
}
