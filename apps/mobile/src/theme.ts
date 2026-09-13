// JobGrid liquid design language.
// Translucent glass surfaces floating over a soft aurora gradient,
// indigo→violet primary, and squishy spring motion everywhere.

export const colors = {
  // Aurora background stops (top → bottom)
  bgTop: "#e7ebff",
  bgMid: "#f4f2ff",
  bgBottom: "#fdf2f8",

  // Floating blobs
  blobIndigo: "rgba(99, 102, 241, 0.35)",
  blobViolet: "rgba(168, 85, 247, 0.28)",
  blobCyan: "rgba(34, 211, 238, 0.25)",
  blobPink: "rgba(244, 114, 182, 0.22)",

  // Glass surfaces
  glass: "rgba(255, 255, 255, 0.60)",
  glassStrong: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.70)",
  glassPressed: "rgba(255, 255, 255, 0.85)",

  // Brand
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  violet: "#8b5cf6",
  primarySoft: "rgba(99, 102, 241, 0.12)",
  primarySofter: "rgba(99, 102, 241, 0.07)",

  // Ink
  text: "#12142b",
  muted: "#5f6480",
  faint: "#9aa0b8",
  onPrimary: "#ffffff",

  // Semantic
  success: "#10b981",
  successSoft: "rgba(16, 185, 129, 0.13)",
  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.12)",
  amber: "#f59e0b",
  amberSoft: "rgba(245, 158, 11, 0.14)",

  border: "rgba(18, 20, 43, 0.08)",
  card: "#ffffff",
  background: "#f4f2ff",
};

export const gradients = {
  primary: ["#6366f1", "#8b5cf6"] as const,
  success: ["#10b981", "#34d399"] as const,
  bubble: ["#6366f1", "#7c5cf1"] as const,
  aurora: [colors.bgTop, colors.bgMid, colors.bgBottom] as const,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const tierColors: Record<string, { fg: string; bg: string; label: string }> = {
  basic: { fg: "#475569", bg: "rgba(71, 85, 105, 0.10)", label: "Basic" },
  branded: { fg: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)", label: "Branded" },
  premium: { fg: "#b45309", bg: "rgba(245, 158, 11, 0.16)", label: "Premium" },
};

export const statusColors: Record<string, { fg: string; bg: string; label: string }> = {
  submitted: { fg: colors.primary, bg: colors.primarySoft, label: "Submitted" },
  viewed: { fg: "#0891b2", bg: "rgba(8, 145, 178, 0.12)", label: "Viewed" },
  shortlisted: { fg: "#047857", bg: colors.successSoft, label: "Shortlisted" },
  rejected: { fg: "#b91c1c", bg: colors.dangerSoft, label: "Not selected" },
  hired: { fg: "#047857", bg: colors.successSoft, label: "Hired" },
};

export const shadow = {
  card: {
    shadowColor: "#312e81",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  floating: {
    shadowColor: "#312e81",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
};
