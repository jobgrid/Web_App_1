import { Syne, DM_Sans } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  display: "swap",
});

export default function A2AOrchestratorLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${syne.variable} ${dmSans.variable}`}>{children}</div>;
}
