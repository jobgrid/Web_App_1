import Link from "next/link";

import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">
            The AI job board. Match, chat, get hired.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <Link href="/jobs" className="hover:text-foreground">Browse jobs</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/signup?role=employer" className="hover:text-foreground">Post a job</Link>
          <Link href="/signup" className="hover:text-foreground">Upload your CV</Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} JobGrid · jobgrid.ai
        </p>
      </div>
    </footer>
  );
}
