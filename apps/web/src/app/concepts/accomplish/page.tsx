import type { Metadata } from "next";
import { Sora, Manrope } from "next/font/google";
import AccomplishApp from "@/components/concepts/accomplish/accomplish-app";
import { catalogSnapshot } from "@/lib/a2a/accomplish";

export const metadata: Metadata = {
  title: "Accomplish · JobGrid concept",
  description: "Phase 0 prototype — describe an outcome, assemble an AI team.",
};

export const dynamic = "force-dynamic";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export default function AccomplishPage() {
  const catalog = catalogSnapshot().map((c) => ({
    name: c.name,
    provider: c.provider?.organization || null,
    skills: c.skills.slice(0, 3).map((s) => s.name || s.id || "skill"),
  }));

  return (
    <div className={`${sora.variable} ${manrope.variable}`}>
      <AccomplishApp catalog={catalog} />
    </div>
  );
}
