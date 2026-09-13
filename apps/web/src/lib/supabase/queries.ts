import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the signed-in employer's company or redirect. Pages render in
 * parallel with their layout, so each employer page must guard itself rather
 * than rely on the layout's redirect having happened first.
 */
export async function requireCompany() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!company) redirect("/employer/onboarding");

  return { supabase, user, company };
}
