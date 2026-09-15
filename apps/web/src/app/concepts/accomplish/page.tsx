import type { Metadata } from "next";
import AccomplishPageShell from "@/components/concepts/accomplish/page-shell";

export const metadata: Metadata = {
  title: "Accomplish",
  description: "Describe an outcome. JobGrid searches AI agents and assembles a team.",
};

export const dynamic = "force-dynamic";

export default function AccomplishPage() {
  return <AccomplishPageShell />;
}
