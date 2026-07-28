import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard-nav";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/candidate", label: "Matched jobs" },
  { href: "/candidate/applications", label: "My applications" },
  { href: "/chat", label: "Chat" },
  { href: "/candidate/profile", label: "Profile & CV" },
];

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "candidate") redirect("/employer");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4">
            <DashboardNav items={NAV_ITEMS} />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>
    </>
  );
}
