import { lookup } from "node:dns/promises";
import { inspectPublicHttpsUrl, isPrivateIP, looksLikeTemplateDocument } from "./url-safety";

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_BYTES = 512_000;
const USER_AGENT = "JobGrid-A2A-QC/0.1 (+https://www.jobgrid.ai)";

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeFetchError";
  }
}

async function assertResolvedPublic(hostname: string) {
  const result = await lookup(hostname, { all: true });
  if (!result.length) throw new SafeFetchError(`DNS lookup failed for ${hostname}`);
  for (const row of result) {
    if (isPrivateIP(row.address)) {
      throw new SafeFetchError(`Blocked private address for ${hostname}`);
    }
  }
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      size += value.byteLength;
      if (size > MAX_BYTES) throw new SafeFetchError("Response too large");
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<{ url: string; status: number; contentType: string; body: string }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  let current = rawUrl;
  for (let hop = 0; hop < 3; hop++) {
    const inspected = inspectPublicHttpsUrl(current);
    if (!inspected.ok || !inspected.url) {
      throw new SafeFetchError(inspected.detail);
    }
    await assertResolvedPublic(inspected.url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(inspected.url, {
        ...rest,
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json, application/a2a+json;q=0.9, text/plain;q=0.4, */*;q=0.1",
          "User-Agent": USER_AGENT,
          ...(rest.headers || {}),
        },
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) throw new SafeFetchError(`Redirect without Location (${res.status})`);
        current = new URL(loc, inspected.url).toString();
        continue;
      }

      const body = await readLimited(res);
      return {
        url: inspected.url.toString(),
        status: res.status,
        contentType: res.headers.get("content-type") || "",
        body,
      };
    } catch (e) {
      if (e instanceof SafeFetchError) throw e;
      if ((e as Error).name === "AbortError") throw new SafeFetchError("Timed out");
      throw new SafeFetchError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      clearTimeout(timer);
    }
  }
  throw new SafeFetchError("Too many redirects");
}

export async function safeFetchJson(rawUrl: string, init?: RequestInit & { timeoutMs?: number }) {
  const fetched = await safeFetch(rawUrl, init);
  if (looksLikeTemplateDocument(fetched.body)) {
    throw new SafeFetchError("Not a hosted Agent Card (template / Jekyll source)");
  }
  const trimmed = fetched.body.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new SafeFetchError(`Not JSON (HTTP ${fetched.status})`);
  }
  try {
    return { ...fetched, json: JSON.parse(fetched.body) as unknown };
  } catch {
    throw new SafeFetchError("Invalid JSON");
  }
}
