/** SSRF-safe URL checks for Agent Card / QC fetches. */

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isPrivateIP(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (v === "::1" || v === "0:0:0:0:0:0:0:1") return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:")) return true;
  if (v.startsWith("::ffff:")) return isPrivateIPv4(v.slice(7));
  return isPrivateIPv4(v);
}

export function hostnameLooksBlocked(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTS.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host.endsWith(".nip.io") || host.endsWith(".sslip.io")) return true;
  if (isPrivateIP(host)) return true;
  return false;
}

export type UrlSafety = {
  ok: boolean;
  url?: URL;
  detail: string;
};

export function inspectPublicHttpsUrl(raw: string): UrlSafety {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, detail: "Not a valid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, url: parsed, detail: "Only https URLs are allowed" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, url: parsed, detail: "URLs with credentials are blocked" };
  }
  if (hostnameLooksBlocked(parsed.hostname)) {
    return { ok: false, url: parsed, detail: `Blocked host: ${parsed.hostname}` };
  }
  return { ok: true, url: parsed, detail: "Public https URL" };
}

export function looksLikeTemplateDocument(body: string): boolean {
  const head = body.slice(0, 400);
  if (head.startsWith("---")) return true;
  if (head.includes("{%") || head.includes("{{")) return true;
  if (/permalink:\s*\/\.well-known/i.test(head)) return true;
  return false;
}
