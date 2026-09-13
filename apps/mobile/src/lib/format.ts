export function salaryLabel(job: {
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
}): string | null {
  if (job.salary_min == null && job.salary_max == null) return null;
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  const range =
    job.salary_min != null && job.salary_max != null && job.salary_min !== job.salary_max
      ? `${fmt(job.salary_min)}–${fmt(job.salary_max)}`
      : fmt((job.salary_min ?? job.salary_max)!);
  const period =
    job.salary_period === "year" ? "yr" : job.salary_period === "day" ? "day" : "hr";
  return `${range}/${period}`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function workTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    casual: "Casual",
    internship: "Internship",
  };
  return labels[type] ?? type;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Parses salary text like "150k - 185k", "$120,000", "80" into numbers. */
export function parseSalaryRange(text: string): { min: number | null; max: number | null } {
  const matches = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)(\s*k)?/gi);
  if (!matches || matches.length === 0) return { min: null, max: null };
  const values = matches.slice(0, 2).map((raw) => {
    const k = /k/i.test(raw);
    const n = parseFloat(raw.replace(/k/i, ""));
    return Math.round(k ? n * 1000 : n);
  });
  if (values.length === 1) return { min: values[0]!, max: values[0]! };
  return { min: Math.min(values[0]!, values[1]!), max: Math.max(values[0]!, values[1]!) };
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
