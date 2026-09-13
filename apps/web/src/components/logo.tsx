import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
        J
      </span>
      <span className="text-lg">
        Job<span className="text-primary">Grid</span>
      </span>
    </Link>
  );
}
