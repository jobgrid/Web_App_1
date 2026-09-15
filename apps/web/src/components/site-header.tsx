import Link from "next/link";

import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/format";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { role: "candidate" | "employer"; full_name: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const dashboardHref = profile?.role === "employer" ? "/employer" : "/candidate";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/jobs" className="transition-colors hover:text-foreground">
              Browse jobs
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/concepts/accomplish" className="transition-colors hover:text-foreground">
              AI agents
            </Link>
            {profile && (
              <Link href="/chat" className="transition-colors hover:text-foreground">
                Chat
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={dashboardHref}>Dashboard</Link>
              </Button>
              <Link href={dashboardHref} aria-label="Your dashboard">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
