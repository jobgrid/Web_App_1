import type { Metadata } from "next";

import { ApiKeysCard } from "@/components/employer/api-keys-card";
import { AtsConnectionsCard } from "@/components/employer/ats-connections-card";
import { CompanySettingsForm } from "@/components/employer/company-settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function EmployerSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", user!.id)
    .single();

  const [{ data: apiKeys }, { data: atsConnections }] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false }),
    supabase.from("ats_connections").select("*").eq("company_id", company!.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company profile, API access and ATS integrations.
        </p>
      </div>
      <CompanySettingsForm company={company!} />
      <ApiKeysCard
        apiKeys={apiKeys ?? []}
        mcpUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobgrid.ai"}/api/mcp`}
      />
      <AtsConnectionsCard connections={atsConnections ?? []} />
    </div>
  );
}
