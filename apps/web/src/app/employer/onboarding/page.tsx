import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your company" };

export default async function EmployerOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user!.id)
    .maybeSingle();
  if (company) redirect("/employer");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Set up your company</CardTitle>
              <CardDescription>
                This appears on your job ads. Your first Basic ad is free.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
