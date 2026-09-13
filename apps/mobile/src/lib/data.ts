import { slugify } from "./format";
import {
  supabase,
  type Application,
  type ChatRequest,
  type Company,
  type Conversation,
  type Job,
  type Message,
  type Profile,
  type Purchase,
} from "./supabase";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}

// ---------------------------------------------------------------------------
// Candidate
// ---------------------------------------------------------------------------

export type FeedJob = Job & { score: number | null };

export async function getCandidateFeed(): Promise<FeedJob[]> {
  const [{ data: matches }, { data: jobRows }] = await Promise.all([
    supabase.rpc("matched_jobs_for_me"),
    supabase
      .from("jobs")
      .select("*, companies(name, brand_color)")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(50),
  ]);
  const scoreMap: Record<string, number> = {};
  for (const match of (matches ?? []) as { job_id: string; score: number }[]) {
    scoreMap[match.job_id] = match.score;
  }
  const jobs = ((jobRows ?? []) as unknown as Job[]).map((job) => ({
    ...job,
    score: scoreMap[job.id] ?? null,
  }));
  jobs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return jobs;
}

export async function getMyApplications(userId: string): Promise<Application[]> {
  const { data } = await supabase
    .from("applications")
    .select("*, jobs(title, location, companies(name, brand_color))")
    .eq("candidate_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Application[];
}

export async function getAppliedJobIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("applications")
    .select("job_id")
    .eq("candidate_id", userId);
  return new Set(((data ?? []) as { job_id: string }[]).map((row) => row.job_id));
}

export async function applyToJob(
  job: Job,
  userId: string,
  score: number | null
): Promise<{ error: string | null }> {
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("cv_path")
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabase.from("applications").insert({
    job_id: job.id,
    candidate_id: userId,
    source: "manual",
    match_score: score,
    cv_path: (candidate as { cv_path: string | null } | null)?.cv_path ?? null,
  });
  if (error) {
    return { error: error.code === "23505" ? "You already applied for this job." : error.message };
  }
  void supabase.from("job_events").insert({ job_id: job.id, event_type: "apply", actor_id: userId });
  return { error: null };
}

export async function requestChat(
  job: Job,
  userId: string,
  message: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("chat_requests").insert({
    job_id: job.id,
    candidate_id: userId,
    company_id: job.company_id,
    message,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "You already requested a chat for this job." : error.message,
    };
  }
  return { error: null };
}

export async function getCandidateProfileDetails(userId: string) {
  const { data } = await supabase
    .from("candidate_profiles")
    .select("headline, location, skills, cv_filename, auto_apply, auto_apply_min_score, open_to_remote")
    .eq("user_id", userId)
    .maybeSingle();
  return data as {
    headline: string;
    location: string;
    skills: string[];
    cv_filename: string | null;
    auto_apply: boolean;
    auto_apply_min_score: number;
    open_to_remote: boolean;
  } | null;
}

export async function setAutoApply(userId: string, enabled: boolean) {
  await supabase.from("candidate_profiles").update({ auto_apply: enabled }).eq("user_id", userId);
}

// ---------------------------------------------------------------------------
// Chat (both roles)
// ---------------------------------------------------------------------------

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, job_id, candidate_id, company_id, last_message_at, jobs(title), companies(name, brand_color), profiles!conversations_candidate_id_fkey(full_name)"
    )
    .order("last_message_at", { ascending: false });
  const conversations = (data ?? []) as unknown as Conversation[];
  if (conversations.length === 0) return conversations;

  // Latest message preview per conversation.
  const { data: recent } = await supabase
    .from("messages")
    .select("conversation_id, body, kind, sender_id, created_at")
    .in(
      "conversation_id",
      conversations.map((conversation) => conversation.id)
    )
    .order("created_at", { ascending: false })
    .limit(80);
  const previews = new Map<string, Conversation["preview"]>();
  for (const row of (recent ?? []) as {
    conversation_id: string;
    body: string;
    kind: string;
    sender_id: string;
    created_at: string;
  }[]) {
    if (!previews.has(row.conversation_id)) previews.set(row.conversation_id, row);
  }
  return conversations.map((conversation) => ({
    ...conversation,
    preview: previews.get(conversation.id) ?? null,
  }));
}

export async function getChatRequests(): Promise<ChatRequest[]> {
  const { data } = await supabase
    .from("chat_requests")
    .select(
      "id, job_id, candidate_id, company_id, message, status, created_at, jobs(title), companies(name, brand_color), profiles!chat_requests_candidate_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as ChatRequest[];
}

/** Accepting triggers conversation creation server-side. */
export async function respondToChatRequest(
  requestId: string,
  accept: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("chat_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId);
  return { error: error?.message ?? null };
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at");
  return (data ?? []) as Message[];
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  body: string
): Promise<Message | null> {
  const { data } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body })
    .select()
    .single();
  return (data as Message | null) ?? null;
}

// ---------------------------------------------------------------------------
// Employer
// ---------------------------------------------------------------------------

export async function getMyCompany(userId: string): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("id, owner_id, name, slug, brand_color, tagline, location")
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as Company | null) ?? null;
}

export type EmployerJob = Job & { applicant_count: number };

export async function getCompanyJobs(companyId: string): Promise<EmployerJob[]> {
  const { data } = await supabase
    .from("jobs")
    .select("*, companies(name, brand_color), applications(count)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as (Job & { applications: { count: number }[] })[]).map(
    (job) => ({
      ...job,
      applicant_count: job.applications?.[0]?.count ?? 0,
    })
  );
}

export type EmployerStats = { views: number; applies: number; chats: number };

export async function getCompanyStats(companyId: string): Promise<EmployerStats> {
  const { data: jobs } = await supabase.from("jobs").select("id").eq("company_id", companyId);
  const ids = ((jobs ?? []) as { id: string }[]).map((job) => job.id);
  if (ids.length === 0) return { views: 0, applies: 0, chats: 0 };
  const { data: events } = await supabase
    .from("job_events")
    .select("event_type")
    .in("job_id", ids)
    .limit(5000);
  const stats: EmployerStats = { views: 0, applies: 0, chats: 0 };
  for (const event of (events ?? []) as { event_type: string }[]) {
    if (event.event_type === "view" || event.event_type === "impression") stats.views += 1;
    if (event.event_type === "apply") stats.applies += 1;
    if (event.event_type === "chat_request") stats.chats += 1;
  }
  return stats;
}

export async function getCompanyApplicants(companyId: string): Promise<Application[]> {
  const { data } = await supabase
    .from("applications")
    .select(
      "*, jobs!inner(title, location, company_id, companies(name, brand_color)), profiles!applications_candidate_id_fkey(full_name)"
    )
    .eq("jobs.company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as Application[];
}

export async function updateApplicationStatus(applicationId: string, status: string) {
  await supabase
    .from("applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", applicationId);
}

export async function getCredits(companyId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("purchases")
    .select("id, product_code, credits_remaining")
    .eq("company_id", companyId);
  const totals: Record<string, number> = { basic: 0, branded: 0, premium: 0 };
  for (const purchase of (data ?? []) as Purchase[]) {
    totals[purchase.product_code] = (totals[purchase.product_code] ?? 0) + purchase.credits_remaining;
  }
  return totals;
}

export type NewAd = {
  title: string;
  category: string;
  location: string;
  isRemote: boolean;
  workType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  skills: string[];
  description: string;
  tier: "basic" | "branded" | "premium";
};

const TIER_DURATION_DAYS: Record<string, number> = { basic: 30, branded: 45, premium: 60 };

/** Consumes one ad credit and publishes the ad. Mirrors the web publish flow. */
export async function publishAd(
  company: Company,
  userId: string,
  ad: NewAd
): Promise<{ error: string | null; jobId?: string }> {
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, credits_remaining")
    .eq("company_id", company.id)
    .eq("product_code", ad.tier)
    .gt("credits_remaining", 0)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (purchase) {
    const { error } = await supabase
      .from("purchases")
      .update({ credits_remaining: (purchase as Purchase).credits_remaining - 1 })
      .eq("id", (purchase as Purchase).id);
    if (error) return { error: error.message };
  } else {
    // First-ever Basic ad is complimentary; anything else needs credits.
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    if (ad.tier !== "basic" || (count ?? 0) > 0) {
      return { error: `No ${ad.tier} credits left — top up from the web dashboard.` };
    }
  }

  const days = TIER_DURATION_DAYS[ad.tier] ?? 30;
  const now = new Date();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      company_id: company.id,
      created_by: userId,
      title: ad.title,
      slug: `${slugify(ad.title)}-${Math.random().toString(36).slice(2, 6)}`,
      description: ad.description,
      category: ad.category,
      location: ad.location,
      is_remote: ad.isRemote,
      work_type: ad.workType,
      salary_min: ad.salaryMin,
      salary_max: ad.salaryMax,
      salary_period: "year",
      skills: ad.skills,
      tier: ad.tier,
      status: "active",
      published_at: now.toISOString(),
      expires_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { error: null, jobId: (data as { id: string }).id };
}
