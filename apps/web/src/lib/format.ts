import type { Database } from "@/lib/database.types";

type WorkType = Database["public"]["Enums"]["work_type"];
type AdTier = Database["public"]["Enums"]["ad_tier"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  casual: "Casual",
  internship: "Internship",
};

export const TIER_LABELS: Record<AdTier, string> = {
  basic: "Basic",
  branded: "Branded",
  premium: "Premium",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  rejected: "Not progressing",
  hired: "Hired",
};

export function formatPrice(cents: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatSalary(
  min: number | null,
  max: number | null,
  period: string,
  currency = "AUD"
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  const suffix = period === "year" ? " / year" : period === "day" ? " / day" : " / hour";
  const range =
    min != null && max != null && min !== max
      ? `${fmt(min)} – ${fmt(max)}`
      : fmt((min ?? max)!);
  return `${range}${suffix}${currency !== "AUD" ? ` ${currency}` : ""}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Last N calendar days as ISO date strings (oldest first). */
export function lastNDaysIso(n: number): string[] {
  const days: string[] = [];
  for (let offset = n - 1; offset >= 0; offset -= 1) {
    days.push(new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10));
  }
  return days;
}

export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "job"
  );
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
