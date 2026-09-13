"use server";

import { revalidatePath } from "next/cache";

import { sendApplicationEmail, sendChatRequestEmail } from "@/lib/email";
import { extractCvText, parseCv } from "@/lib/cv-parser";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; success?: string };

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobgrid.ai";

async function computeMatchScore(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  jobId: string
): Promise<number | null> {
  const [{ data: cp }, { data: job }] = await Promise.all([
    supabase.from("candidate_profiles").select("*").eq("user_id", userId).single(),
    supabase.from("jobs").select("*").eq("id", jobId).single(),
  ]);
  if (!cp || !job) return null;
  const { data } = await supabase.rpc("match_score", {
    p_candidate_skills: cp.skills,
    p_candidate_location: cp.location,
    p_candidate_work_types: cp.preferred_work_types,
    p_open_to_remote: cp.open_to_remote,
    p_job_skills: job.skills,
    p_job_location: job.location,
    p_job_work_type: job.work_type,
    p_job_is_remote: job.is_remote,
  });
  return data ?? null;
}

async function notifyEmployerOfApplication(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  candidateName: string,
  matchScore: number | null
) {
  const { data: job } = await supabase
    .from("jobs")
    .select("title, companies(owner_id)")
    .eq("id", jobId)
    .single();
  if (!job?.companies?.owner_id) return;
  const { data: owner } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", job.companies.owner_id)
    .single();
  if (!owner?.email) return;
  await sendApplicationEmail({
    to: owner.email,
    candidateName,
    jobTitle: job.title,
    matchScore,
    siteUrl: SITE_URL(),
  });
}

export async function applyToJob(jobId: string, coverNote: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in as a candidate to apply." };

  const { data: cp } = await supabase
    .from("candidate_profiles")
    .select("cv_path")
    .eq("user_id", user.id)
    .single();
  if (!cp) return { error: "Only candidate accounts can apply." };

  const matchScore = await computeMatchScore(supabase, user.id, jobId);
  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    candidate_id: user.id,
    cover_note: coverNote,
    cv_path: cp.cv_path,
    match_score: matchScore,
    source: "manual",
  });

  if (error) {
    if (error.code === "23505") return { error: "You already applied for this job." };
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  await notifyEmployerOfApplication(supabase, jobId, profile?.full_name ?? "A candidate", matchScore);

  revalidatePath("/candidate");
  return { success: "Application submitted." };
}

export async function batchApply(jobIds: string[]): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in as a candidate to apply." };
  if (jobIds.length === 0) return { error: "Select at least one job." };
  if (jobIds.length > 25) return { error: "You can batch apply to up to 25 jobs at once." };

  const { data: cp } = await supabase
    .from("candidate_profiles")
    .select("cv_path")
    .eq("user_id", user.id)
    .single();
  if (!cp?.cv_path) return { error: "Upload your CV before batch applying." };

  let applied = 0;
  for (const jobId of jobIds) {
    const matchScore = await computeMatchScore(supabase, user.id, jobId);
    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      candidate_id: user.id,
      cv_path: cp.cv_path,
      match_score: matchScore,
      source: "batch",
      cover_note: "",
    });
    if (!error) applied += 1;
  }

  revalidatePath("/candidate");
  return applied > 0
    ? { success: `Applied to ${applied} job${applied === 1 ? "" : "s"}.` }
    : { error: "No new applications were created (you may have already applied)." };
}

export async function requestChat(jobId: string, message: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in as a candidate to chat with employers." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, company_id, companies(owner_id, name)")
    .eq("id", jobId)
    .single();
  if (!job) return { error: "Job not found." };

  const { error } = await supabase.from("chat_requests").insert({
    job_id: job.id,
    candidate_id: user.id,
    company_id: job.company_id,
    message,
  });

  if (error) {
    if (error.code === "23505") return { error: "You already requested a chat for this job." };
    return { error: error.message };
  }

  if (job.companies?.owner_id) {
    const [{ data: owner }, { data: me }] = await Promise.all([
      supabase.from("profiles").select("email").eq("id", job.companies.owner_id).single(),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);
    if (owner?.email) {
      await sendChatRequestEmail({
        to: owner.email,
        candidateName: me?.full_name ?? "A candidate",
        jobTitle: job.title,
        message,
        siteUrl: SITE_URL(),
      });
    }
  }

  revalidatePath("/chat");
  return { success: "Chat request sent. You'll be notified when the employer accepts." };
}

export async function uploadCv(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const file = formData.get("cv") as File | null;
  if (!file || file.size === 0) return { error: "Choose a CV file (PDF or text)." };
  if (file.size > 10 * 1024 * 1024) return { error: "CV must be under 10 MB." };

  let text = "";
  try {
    text = await extractCvText(file);
  } catch (error) {
    console.error("[uploadCv] extract failed", error);
    return { error: "Could not read that file. Try a PDF or plain-text CV." };
  }

  const path = `${user.id}/cv-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return { error: uploadError.message };

  const parsed = await parseCv(text);
  const { data: existing } = await supabase
    .from("candidate_profiles")
    .select("headline, location, skills")
    .eq("user_id", user.id)
    .single();

  const { error: updateError } = await supabase
    .from("candidate_profiles")
    .update({
      cv_path: path,
      cv_filename: file.name,
      cv_text: text.slice(0, 100_000),
      headline: existing?.headline || parsed.headline,
      location: existing?.location || parsed.location,
      skills: Array.from(new Set([...(existing?.skills ?? []), ...parsed.skills])),
      years_experience: parsed.yearsExperience ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/candidate");
  revalidatePath("/candidate/profile");
  return {
    success: `CV uploaded. Found ${parsed.skills.length} skills — your job matches are ready.`,
  };
}

export async function updateCandidateProfile(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, 30);

  const { error } = await supabase
    .from("candidate_profiles")
    .update({
      headline: String(formData.get("headline") ?? "").slice(0, 120),
      location: String(formData.get("location") ?? "").slice(0, 80),
      skills,
      open_to_remote: formData.get("open_to_remote") === "on",
      auto_apply: formData.get("auto_apply") === "on",
      auto_apply_min_score: Number(formData.get("auto_apply_min_score") ?? 75),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/candidate");
  revalidatePath("/candidate/profile");
  return { success: "Profile updated." };
}
