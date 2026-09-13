"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { packDiscount } from "@/lib/constants";
import { sendChatAcceptedEmail } from "@/lib/email";
import { slugify } from "@/lib/format";
import { getAtsProvider, type AtsProviderId } from "@/lib/ats";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; success?: string };

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobgrid.ai";

async function getOwnedCompany(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, company: null };
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  return { user, company };
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------
export async function createCompany(_prev: Result, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  const slug = `${slugify(name)}-${randomBytes(2).toString("hex")}`;
  const { error } = await supabase.from("companies").insert({
    owner_id: user.id,
    name,
    slug,
    location: String(formData.get("location") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim() || null,
    tagline: String(formData.get("tagline") ?? "").trim(),
    brand_color: String(formData.get("brand_color") ?? "#6366f1"),
  });
  if (error) return { error: error.message };

  redirect("/employer");
}

export async function updateCompany(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const { company } = await getOwnedCompany(supabase);
  if (!company) return { error: "No company found." };

  const { error } = await supabase
    .from("companies")
    .update({
      name: String(formData.get("name") ?? company.name).trim(),
      location: String(formData.get("location") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim() || null,
      tagline: String(formData.get("tagline") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      brand_color: String(formData.get("brand_color") ?? company.brand_color),
    })
    .eq("id", company.id);
  if (error) return { error: error.message };

  revalidatePath("/employer/settings");
  return { success: "Company updated." };
}

// ---------------------------------------------------------------------------
// Billing (demo checkout — records the purchase and grants credits)
// ---------------------------------------------------------------------------
export async function buyCredits(productCode: string, quantity: number): Promise<Result> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return { error: "Quantity must be between 1 and 50." };
  }

  const supabase = await createClient();
  const { company } = await getOwnedCompany(supabase);
  if (!company) return { error: "Create your company first." };

  const { data: product } = await supabase
    .from("ad_products")
    .select("*")
    .eq("code", productCode)
    .single();
  if (!product) return { error: "Unknown product." };

  const discount = packDiscount(quantity);
  const unitPrice = Math.round(product.price_cents * (1 - discount));

  const { error } = await supabase.from("purchases").insert({
    company_id: company.id,
    product_code: product.code,
    quantity,
    credits_remaining: quantity,
    unit_price_cents: unitPrice,
    total_cents: unitPrice * quantity,
    status: "paid",
  });
  if (error) return { error: error.message };

  revalidatePath("/employer/billing");
  return {
    success: `Purchased ${quantity} ${product.name} credit${quantity === 1 ? "" : "s"}${discount > 0 ? ` (${Math.round(discount * 100)}% pack discount applied)` : ""}.`,
  };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function publishJob(_prev: Result, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const { user, company } = await getOwnedCompany(supabase);
  if (!user || !company) return { error: "Create your company first." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tier = String(formData.get("tier") ?? "basic") as Database["public"]["Enums"]["ad_tier"];
  if (!title || !description) return { error: "Title and description are required." };

  const { data: product } = await supabase
    .from("ad_products")
    .select("*")
    .eq("tier", tier)
    .single();
  if (!product) return { error: "Unknown ad tier." };

  // Consume a credit for this tier; the first Basic ad is on the house.
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, credits_remaining")
    .eq("company_id", company.id)
    .eq("product_code", product.code)
    .gt("credits_remaining", 0)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (purchase) {
    await supabase
      .from("purchases")
      .update({ credits_remaining: purchase.credits_remaining - 1 })
      .eq("id", purchase.id);
  } else if (tier === "basic") {
    const { count } = await supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    if ((count ?? 0) > 0) {
      return { error: "No Basic ad credits left. Buy more in Billing." };
    }
    await supabase.from("purchases").insert({
      company_id: company.id,
      product_code: product.code,
      quantity: 1,
      credits_remaining: 0,
      unit_price_cents: 0,
      total_cents: 0,
      status: "complimentary",
    });
  } else {
    return { error: `No ${product.name} credits available. Buy credits in Billing first.` };
  }

  const highlights = [1, 2, 3]
    .map((index) => String(formData.get(`highlight_${index}`) ?? "").trim())
    .filter(Boolean);
  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 20);

  const salaryMin = Number(formData.get("salary_min") ?? 0) || null;
  const salaryMax = Number(formData.get("salary_max") ?? 0) || null;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + product.duration_days * 86_400_000);

  const { error } = await supabase.from("jobs").insert({
    company_id: company.id,
    created_by: user.id,
    title,
    slug: `${slugify(title)}-${randomBytes(3).toString("hex")}`,
    description,
    highlights: tier === "basic" ? [] : highlights,
    category: String(formData.get("category") ?? "Other"),
    location: String(formData.get("location") ?? "").trim(),
    is_remote: formData.get("is_remote") === "on",
    work_type: String(formData.get("work_type") ?? "full_time") as Database["public"]["Enums"]["work_type"],
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_period: String(formData.get("salary_period") ?? "year"),
    skills,
    tier,
    status: "active",
    published_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/employer");
  revalidatePath("/jobs");
  redirect("/employer/jobs?published=1");
}

// Publish an existing draft (e.g. imported from an ATS) by consuming a credit.
export async function publishDraft(jobId: string, tier: Database["public"]["Enums"]["ad_tier"]): Promise<Result> {
  const supabase = await createClient();
  const { company } = await getOwnedCompany(supabase);
  if (!company) return { error: "Create your company first." };

  const { data: product } = await supabase
    .from("ad_products")
    .select("*")
    .eq("tier", tier)
    .single();
  if (!product) return { error: "Unknown ad tier." };

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, credits_remaining")
    .eq("company_id", company.id)
    .eq("product_code", product.code)
    .gt("credits_remaining", 0)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!purchase) {
    return { error: `No ${product.name} credits available. Buy credits in Billing first.` };
  }
  await supabase
    .from("purchases")
    .update({ credits_remaining: purchase.credits_remaining - 1 })
    .eq("id", purchase.id);

  const now = new Date();
  const { error } = await supabase
    .from("jobs")
    .update({
      tier,
      status: "active",
      published_at: now.toISOString(),
      expires_at: new Date(now.getTime() + product.duration_days * 86_400_000).toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", jobId);
  if (error) return { error: error.message };

  revalidatePath("/employer/jobs");
  revalidatePath("/jobs");
  return { success: "Job published." };
}

export async function closeJob(jobId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/employer/jobs");
  return { success: "Job closed." };
}

export async function extendJob(jobId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("expires_at, tier")
    .eq("id", jobId)
    .single();
  if (!job) return { error: "Job not found." };

  const { data: product } = await supabase
    .from("ad_products")
    .select("duration_days")
    .eq("tier", job.tier)
    .single();
  const days = product?.duration_days ?? 30;
  const base = job.expires_at && new Date(job.expires_at) > new Date()
    ? new Date(job.expires_at)
    : new Date();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "active",
      expires_at: new Date(base.getTime() + days * 86_400_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (error) return { error: error.message };
  revalidatePath("/employer/jobs");
  return { success: `Extended by ${days} days.` };
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
export async function updateApplicationStatus(
  applicationId: string,
  status: Database["public"]["Enums"]["application_status"]
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) return { error: error.message };
  revalidatePath("/employer/jobs");
  return { success: "Application updated." };
}

export async function getCvDownloadUrl(cvPath: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("cvs").createSignedUrl(cvPath, 300);
  if (error || !data) return { error: "Could not create download link." };
  return { url: data.signedUrl };
}

// ---------------------------------------------------------------------------
// Chat requests
// ---------------------------------------------------------------------------
export async function respondToChatRequest(requestId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId);
  if (error) return { error: error.message };

  if (accept) {
    const { data: request } = await supabase
      .from("chat_requests")
      .select("candidate_id, job_id, companies(name), jobs(title)")
      .eq("id", requestId)
      .single();
    if (request) {
      const { data: candidate } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", request.candidate_id)
        .single();
      if (candidate?.email) {
        await sendChatAcceptedEmail({
          to: candidate.email,
          companyName: request.companies?.name ?? "The employer",
          jobTitle: request.jobs?.title ?? null,
          siteUrl: SITE_URL(),
        });
      }
    }
  }

  revalidatePath("/chat");
  return { success: accept ? "Chat unlocked." : "Request declined." };
}

// ---------------------------------------------------------------------------
// API keys (for the MCP server & ATS integrations)
// ---------------------------------------------------------------------------
export async function createApiKey(name: string): Promise<Result & { plainKey?: string }> {
  const supabase = await createClient();
  const { company } = await getOwnedCompany(supabase);
  if (!company) return { error: "Create your company first." };

  const plainKey = `jg_live_${randomBytes(24).toString("base64url")}`;
  const keyHash = createHash("sha256").update(plainKey).digest("hex");

  const { error } = await supabase.from("api_keys").insert({
    company_id: company.id,
    name: name.trim() || "Default key",
    key_prefix: plainKey.slice(0, 12),
    key_hash: keyHash,
  });
  if (error) return { error: error.message };

  revalidatePath("/employer/settings");
  return { success: "API key created. Copy it now — it won't be shown again.", plainKey };
}

export async function revokeApiKey(keyId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  if (error) return { error: error.message };
  revalidatePath("/employer/settings");
  return { success: "API key revoked." };
}

// ---------------------------------------------------------------------------
// ATS connections
// ---------------------------------------------------------------------------
export async function connectAts(provider: AtsProviderId): Promise<Result> {
  const supabase = await createClient();
  const { company } = await getOwnedCompany(supabase);
  if (!company) return { error: "Create your company first." };

  const { error } = await supabase.from("ats_connections").upsert(
    {
      company_id: company.id,
      provider,
      status: "connected",
      settings: { mode: "demo" },
    },
    { onConflict: "company_id,provider" }
  );
  if (error) return { error: error.message };
  revalidatePath("/employer/settings");
  return { success: `${provider} connected (demo mode — add OAuth credentials for live sync).` };
}

export async function syncAts(provider: AtsProviderId): Promise<Result> {
  const supabase = await createClient();
  const { user, company } = await getOwnedCompany(supabase);
  if (!user || !company) return { error: "Create your company first." };

  const { data: connection } = await supabase
    .from("ats_connections")
    .select("*")
    .eq("company_id", company.id)
    .eq("provider", provider)
    .single();
  if (!connection || connection.status !== "connected") {
    return { error: `Connect ${provider} first.` };
  }

  const adapter = getAtsProvider(provider);
  let atsJobs;
  try {
    atsJobs = await adapter.fetchOpenJobs(connection.settings as Record<string, unknown>);
  } catch (error) {
    console.error(`[ats:${provider}] sync failed`, error);
    return { error: `Sync from ${provider} failed. Check your connection settings.` };
  }

  let imported = 0;
  for (const atsJob of atsJobs) {
    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", company.id)
      .eq("external_ref", atsJob.externalRef)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("jobs").insert({
      company_id: company.id,
      created_by: user.id,
      title: atsJob.title,
      slug: `${slugify(atsJob.title)}-${randomBytes(3).toString("hex")}`,
      description: atsJob.description,
      category: atsJob.category ?? "Other",
      location: atsJob.location ?? "",
      work_type: atsJob.workType ?? "full_time",
      salary_min: atsJob.salaryMin ?? null,
      salary_max: atsJob.salaryMax ?? null,
      skills: atsJob.skills ?? [],
      status: "draft",
      external_ref: atsJob.externalRef,
      source: provider,
    });
    if (!error) imported += 1;
  }

  await supabase
    .from("ats_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  revalidatePath("/employer/jobs");
  revalidatePath("/employer/settings");
  return {
    success: `Synced ${imported} new job${imported === 1 ? "" : "s"} from ${provider} as drafts. Publish them from your Jobs page.`,
  };
}
