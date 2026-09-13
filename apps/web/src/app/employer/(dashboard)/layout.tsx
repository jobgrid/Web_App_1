import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard-nav";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/employer", label: "Dashboard" },
  { href: "/employer/jobs", label: "Jobs & applicants" },
  { href: "/chat", label: "Chat" },
  { href: "/employer/billing", label: "Billing" },
  { href: "/employer/settings", label: "Settings" },
];

export default async function EmployerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user!.id)
    .maybeSingle();
  if (!company) redirect("/employer/onboarding");

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
