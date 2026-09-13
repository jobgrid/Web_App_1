import type { Metadata } from "next";

import { PostJobForm } from "@/components/employer/post-job-form";
import { requireCompany } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const { supabase, company } = await requireCompany();

  const [{ data: products }, { data: purchases }] = await Promise.all([
    supabase.from("ad_products").select("*").order("sort"),
    supabase
      .from("purchases")
      .select("product_code, credits_remaining")
      .eq("company_id", company.id),
  ]);

  const credits: Record<string, number> = {};
  for (const purchase of purchases ?? []) {
    credits[purchase.product_code] =
      (credits[purchase.product_code] ?? 0) + purchase.credits_remaining;
  }
  const hasAnyPurchase = (purchases ?? []).length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Post a job</h1>
        <p className="text-sm text-muted-foreground">
          Pick an ad type, fill in the details and go live instantly.
        </p>
      </div>
      <PostJobForm
        products={products ?? []}
        credits={credits}
        firstAdFree={!hasAnyPurchase}
      />
    </div>
  );
}
