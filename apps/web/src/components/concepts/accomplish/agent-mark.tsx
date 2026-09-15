/** Deterministic colorful agent marks — visual only (not from Agent Cards). */
export function AgentMark({
  iconKey,
  label,
  size = 40,
}: {
  iconKey: string;
  label: string;
  size?: number;
}) {
  const palette: Record<string, [string, string]> = {
    orbit: ["#1a73e8", "#8ab4f8"],
    hex: ["#0f9d58", "#7fd3a8"],
    pulse: ["#ea4335", "#f6aea9"],
    leaf: ["#188038", "#81c995"],
    bolt: ["#f9ab00", "#fdd663"],
    mark: ["#9334e6", "#d7aefb"],
    ring: ["#007b83", "#78d9de"],
    grid: ["#1967d2", "#8ab4f8"],
    wave: ["#c5221f", "#f28b82"],
    spark: ["#e37400", "#fdc69c"],
  };
  const [a, b] = palette[iconKey] || palette.orbit;
  const letter = (label.replace(/[^a-zA-Z0-9]/g, "")[0] || "A").toUpperCase();

  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        display: "inline-grid",
        placeItems: "center",
        background: `linear-gradient(145deg, ${a} 0%, ${b} 100%)`,
        color: "#fff",
        fontWeight: 750,
        fontSize: Math.round(size * 0.38),
        boxShadow: "0 1px 2px rgba(32,33,36,0.12), inset 0 0 0 1px rgba(255,255,255,0.28)",
        flexShrink: 0,
        overflow: "hidden",
        fontFamily: "var(--font-display), sans-serif",
      }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>{letter}</span>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        style={{ position: "absolute", inset: 0, opacity: 0.28 }}
      >
        {iconKey === "orbit" && <circle cx="28" cy="12" r="7" fill="none" stroke="#fff" strokeWidth="2.5" />}
        {iconKey === "hex" && <path d="M20 5l13 7.5v15L20 35 7 22.5v-15z" fill="none" stroke="#fff" strokeWidth="2" />}
        {iconKey === "pulse" && <path d="M4 22h8l3-8 5 16 4-10h12" fill="none" stroke="#fff" strokeWidth="2.5" />}
        {iconKey === "leaf" && <path d="M20 6c10 6 12 16 0 28C8 22 10 12 20 6z" fill="#fff" opacity="0.5" />}
        {iconKey === "bolt" && <path d="M22 4L10 22h9l-3 14 14-20h-9z" fill="#fff" />}
        {iconKey === "mark" && <circle cx="20" cy="20" r="10" fill="none" stroke="#fff" strokeWidth="3" />}
        {iconKey === "ring" && (
          <>
            <circle cx="20" cy="20" r="11" fill="none" stroke="#fff" strokeWidth="2" />
            <circle cx="20" cy="20" r="5" fill="#fff" />
          </>
        )}
        {iconKey === "grid" && (
          <>
            <rect x="9" y="9" width="9" height="9" rx="1.5" fill="#fff" />
            <rect x="22" y="9" width="9" height="9" rx="1.5" fill="#fff" />
            <rect x="9" y="22" width="9" height="9" rx="1.5" fill="#fff" />
            <rect x="22" y="22" width="9" height="9" rx="1.5" fill="#fff" />
          </>
        )}
        {iconKey === "wave" && (
          <path d="M2 24c5-8 8 8 13 0s8 8 13 0 8 8 13 0" fill="none" stroke="#fff" strokeWidth="2.5" />
        )}
        {iconKey === "spark" && (
          <path d="M20 4l2.5 12L34 20l-11.5 2.5L20 36l-2.5-13.5L6 20l11.5-4z" fill="#fff" />
        )}
      </svg>
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <span
      title="Verified (prototype badge)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 650,
        color: "#1967d2",
        background: "#e8f0fe",
        borderRadius: 999,
        padding: "2px 8px",
        lineHeight: 1.4,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="#1a73e8" />
        <path d="M4.8 8.2l2 2 4.2-4.4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      Verified
    </span>
  );
}

export function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  return (
    <span style={{ color: "#e37400", letterSpacing: 1, fontSize: 12 }} aria-label={`${rating} stars`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span style={{ color: "#dadce0" }}>{"★".repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}</span>
    </span>
  );
}
