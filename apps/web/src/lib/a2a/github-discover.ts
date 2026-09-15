import githubIndex from "./github-index.json";
import { normalizeAgentCard } from "./normalize";
import { safeFetchJson } from "./safe-fetch";
import type { DiscoveredAgentCard } from "./types";

export type GitHubCardHit = {
  owner: string;
  repo: string;
  path: string;
  htmlUrl: string;
  rawUrl: string;
};

type IndexEntry = { owner: string; repo: string; path?: string };

function githubToken() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
}

export function rawGithubUrl(owner: string, repo: string, path: string, ref = "HEAD") {
  const clean = path.replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${clean}`;
}

export function indexedGithubHits(): GitHubCardHit[] {
  return (githubIndex as IndexEntry[]).map((e) => {
    const path = e.path || ".well-known/agent-card.json";
    return {
      owner: e.owner,
      repo: e.repo,
      path,
      htmlUrl: `https://github.com/${e.owner}/${e.repo}/blob/HEAD/${path}`,
      rawUrl: rawGithubUrl(e.owner, e.repo, path),
    };
  });
}

type GithubSearchItem = {
  name?: string;
  path?: string;
  repository?: { full_name?: string; html_url?: string };
};

async function searchGithubCode(query: string, page: number): Promise<GitHubCardHit[]> {
  const token = githubToken();
  if (!token) return [];
  const url = new URL("https://api.github.com/search/code");
  url.searchParams.set("q", query);
  url.searchParams.set("per_page", "50");
  url.searchParams.set("page", String(page));
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "JobGrid-A2A-QC/0.1",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: GithubSearchItem[] };
  const hits: GitHubCardHit[] = [];
  for (const item of json.items || []) {
    const full = item.repository?.full_name || "";
    const [owner, repo] = full.split("/");
    const path = item.path || "";
    if (!owner || !repo || !path) continue;
    if (!path.includes(".well-known/") || !path.endsWith(".json")) continue;
    hits.push({
      owner,
      repo,
      path,
      htmlUrl: `${item.repository?.html_url || `https://github.com/${owner}/${repo}`}/blob/HEAD/${path}`,
      rawUrl: rawGithubUrl(owner, repo, path),
    });
  }
  return hits;
}

export async function discoverGithubAgentCards(limit = 80): Promise<GitHubCardHit[]> {
  const seen = new Set<string>();
  const out: GitHubCardHit[] = [];
  const push = (hit: GitHubCardHit) => {
    const key = hit.rawUrl.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(hit);
  };

  for (const hit of indexedGithubHits()) push(hit);

  try {
    const live = await searchGithubCode("path:.well-known filename:agent-card.json", 1);
    for (const hit of live) push(hit);
  } catch {
    // indexed snapshot is enough when search is rate-limited
  }

  return out.slice(0, limit);
}

export async function fetchGithubCard(hit: GitHubCardHit): Promise<DiscoveredAgentCard> {
  try {
    const fetched = await safeFetchJson(hit.rawUrl);
    if (!fetched.json || typeof fetched.json !== "object" || Array.isArray(fetched.json)) {
      throw new Error("Not an object");
    }
    const normalized = normalizeAgentCard(fetched.json as Record<string, unknown>, hit.rawUrl);
    if (!normalized) {
      return {
        name: `${hit.owner}/${hit.repo}`,
        description: "",
        skills: [],
        capabilities: [],
        sourceUrl: hit.rawUrl,
        discovery: "github",
        status: "error",
        error: "Not a valid Agent Card (missing name)",
        github: { owner: hit.owner, repo: hit.repo, htmlUrl: hit.htmlUrl },
      };
    }
    return {
      ...normalized,
      discovery: "github",
      github: { owner: hit.owner, repo: hit.repo, htmlUrl: hit.htmlUrl },
    };
  } catch (e) {
    return {
      name: `${hit.owner}/${hit.repo}`,
      description: "",
      skills: [],
      capabilities: [],
      sourceUrl: hit.rawUrl,
      discovery: "github",
      status: "error",
      error: e instanceof Error ? e.message : "GitHub fetch failed",
      github: { owner: hit.owner, repo: hit.repo, htmlUrl: hit.htmlUrl },
    };
  }
}
