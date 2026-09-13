import { createHash } from "node:crypto";

import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod/v3";

import { createAdminClient, createAnonClient } from "@/lib/supabase/admin";
import { WORK_TYPE_LABELS, formatSalary } from "@/lib/format";

/**
 * JobGrid MCP server — lets AI agents and ATS middleware search jobs, post
 * jobs, review applications and pull analytics.
 *
 * Endpoint: POST /api/mcp (Streamable HTTP)
 * Auth:     Authorization: Bearer jg_live_… (create keys in Employer Settings)
 *           Public tools (search_jobs, get_job) work without a key.
 */

type CompanyAuth = { companyId: string; companyName: string };

function requireCompany(extra: unknown): CompanyAuth {
  const authInfo = (extra as { authInfo?: { extra?: CompanyAuth } })?.authInfo;
  if (!authInfo?.extra?.companyId) {
    throw new Error(
      "This tool requires an employer API key. Pass it as: Authorization: Bearer jg_live_…"
    );
  }
  return authInfo.extra;
}

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

const handler = createMcpHandler(
  (server) => {
    // ------------------------------------------------------------------ public
    server.tool(
      "search_jobs",
      "Search live job ads on JobGrid. Public — no API key required.",
      {
        query: z.string().optional().describe("Keywords to match in title/description"),
        location: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      },
      async ({ query, location, limit }) => {
        const supabase = createAnonClient();
        let builder = supabase
          .from("jobs")
          .select("id, slug, title, location, is_remote, work_type, salary_min, salary_max, salary_period, currency, skills, tier, expires_at, companies(name)")
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString());
        if (query) builder = builder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
        if (location) builder = builder.ilike("location", `%${location}%`);
        const { data, error } = await builder
          .order("tier", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(limit);
        if (error) throw new Error(error.message);
        return textResult(
          (data ?? []).map((job) => ({
            id: job.id,
            title: job.title,
            company: job.companies?.name,
            location: job.is_remote ? `Remote · ${job.location}` : job.location,
            workType: WORK_TYPE_LABELS[job.work_type],
            salary: formatSalary(job.salary_min, job.salary_max, job.salary_period, job.currency),
            skills: job.skills,
            tier: job.tier,
            expiresAt: job.expires_at,
            url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobgrid.ai"}/jobs/${job.slug}`,
          }))
        );
      }
    );

    server.tool(
      "get_job",
      "Get the full details of a job ad by id. Public — no API key required.",
      { job_id: z.string().uuid() },
      async ({ job_id }) => {
        const supabase = createAnonClient();
        const { data, error } = await supabase
          .from("jobs")
          .select("*, companies(name, website, location)")
          .eq("id", job_id)
          .single();
        if (error) throw new Error(error.message);
        return textResult(data);
      }
    );

    // --------------------------------------------------------------- employer
    server.tool(
      "post_job",
      "Post a new job ad for your company (requires employer API key). The job goes live as a Basic ad for 30 days; manage tiers/credits in the JobGrid dashboard.",
      {
        title: z.string().min(3),
        description: z.string().min(20),
        location: z.string().default(""),
        is_remote: z.boolean().default(false),
        work_type: z.enum(["full_time", "part_time", "contract", "casual", "internship"]).default("full_time"),
        category: z.string().default("Other"),
        salary_min: z.number().int().optional(),
        salary_max: z.number().int().optional(),
        skills: z.array(z.string()).default([]),
        external_ref: z.string().optional().describe("Your ATS reference id for deduplication"),
      },
      async (args, extra) => {
        const { companyId } = requireCompany(extra);
        const admin = createAdminClient();
        if (!admin) throw new Error("Server not configured: SUPABASE_SECRET_KEY missing.");

        const { data: company } = await admin
          .from("companies")
          .select("owner_id")
          .eq("id", companyId)
          .single();
        if (!company) throw new Error("Company not found.");

        if (args.external_ref) {
          const { data: existing } = await admin
            .from("jobs")
            .select("id")
            .eq("company_id", companyId)
            .eq("external_ref", args.external_ref)
            .maybeSingle();
          if (existing) return textResult({ status: "skipped", reason: "external_ref already imported", jobId: existing.id });
        }

        const slugBase = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
        const now = new Date();
        const { data, error } = await admin
          .from("jobs")
          .insert({
            company_id: companyId,
            created_by: company.owner_id,
            title: args.title,
            slug: `${slugBase}-${Math.random().toString(36).slice(2, 8)}`,
            description: args.description,
            location: args.location,
            is_remote: args.is_remote,
            work_type: args.work_type,
            category: args.category,
            salary_min: args.salary_min ?? null,
            salary_max: args.salary_max ?? null,
            skills: args.skills,
            status: "active",
            source: "mcp",
            external_ref: args.external_ref ?? null,
            published_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
          })
          .select("id, slug")
          .single();
        if (error) throw new Error(error.message);
        return textResult({
          status: "published",
          jobId: data.id,
          url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobgrid.ai"}/jobs/${data.slug}`,
        });
      }
    );

    server.tool(
      "list_applications",
      "List applications for your company's jobs (requires employer API key).",
      {
        job_id: z.string().uuid().optional(),
        status: z.enum(["submitted", "viewed", "shortlisted", "rejected", "hired"]).optional(),
      },
      async ({ job_id, status }, extra) => {
        const { companyId } = requireCompany(extra);
        const admin = createAdminClient();
        if (!admin) throw new Error("Server not configured: SUPABASE_SECRET_KEY missing.");

        let builder = admin
          .from("applications")
          .select("id, status, source, match_score, cover_note, created_at, jobs!inner(id, title, company_id), profiles(full_name, email)")
          .eq("jobs.company_id", companyId);
        if (job_id) builder = builder.eq("job_id", job_id);
        if (status) builder = builder.eq("status", status);
        const { data, error } = await builder.order("created_at", { ascending: false }).limit(100);
        if (error) throw new Error(error.message);
        return textResult(
          (data ?? []).map((application) => ({
            id: application.id,
            job: application.jobs?.title,
            candidate: application.profiles?.full_name,
            email: application.profiles?.email,
            matchScore: application.match_score,
            status: application.status,
            source: application.source,
            coverNote: application.cover_note,
            createdAt: application.created_at,
          }))
        );
      }
    );

    server.tool(
      "update_application_status",
      "Move an application through your pipeline (requires employer API key).",
      {
        application_id: z.string().uuid(),
        status: z.enum(["submitted", "viewed", "shortlisted", "rejected", "hired"]),
      },
      async ({ application_id, status }, extra) => {
        const { companyId } = requireCompany(extra);
        const admin = createAdminClient();
        if (!admin) throw new Error("Server not configured: SUPABASE_SECRET_KEY missing.");

        const { data: application } = await admin
          .from("applications")
          .select("id, jobs!inner(company_id)")
          .eq("id", application_id)
          .single();
        if (!application || application.jobs?.company_id !== companyId) {
          throw new Error("Application not found for your company.");
        }
        const { error } = await admin
          .from("applications")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", application_id);
        if (error) throw new Error(error.message);
        return textResult({ status: "updated", applicationId: application_id, newStatus: status });
      }
    );

    server.tool(
      "get_job_analytics",
      "Views, clicks, applies and chat requests per job for your company (requires employer API key).",
      {},
      async (_args, extra) => {
        const { companyId } = requireCompany(extra);
        const admin = createAdminClient();
        if (!admin) throw new Error("Server not configured: SUPABASE_SECRET_KEY missing.");

        const [{ data: stats, error }, { data: jobs }] = await Promise.all([
          admin.rpc("company_job_stats", { p_company_id: companyId }),
          admin.from("jobs").select("id, title, status, expires_at").eq("company_id", companyId),
        ]);
        if (error) throw new Error(error.message);
        const titles = new Map((jobs ?? []).map((job) => [job.id, job]));
        return textResult(
          (stats ?? []).map((row) => ({
            job: titles.get(row.job_id)?.title,
            status: titles.get(row.job_id)?.status,
            expiresAt: titles.get(row.job_id)?.expires_at,
            views: Number(row.views),
            clicks: Number(row.clicks),
            applies: Number(row.applies),
            chatRequests: Number(row.chats),
          }))
        );
      }
    );
  },
  {},
  { basePath: "/api" }
);

// Bearer-token auth: employer API keys (jg_live_…) are verified against their
// SHA-256 hash. Auth is optional — public tools work anonymously.
const authedHandler = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    if (!bearerToken || !bearerToken.startsWith("jg_live_")) return undefined;
    const admin = createAdminClient();
    if (!admin) return undefined;

    const keyHash = createHash("sha256").update(bearerToken).digest("hex");
    const { data: apiKey } = await admin
      .from("api_keys")
      .select("id, company_id, revoked_at, companies(name)")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!apiKey || apiKey.revoked_at) return undefined;

    await admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKey.id);

    return {
      token: bearerToken,
      clientId: apiKey.company_id,
      scopes: ["employer"],
      extra: {
        companyId: apiKey.company_id,
        companyName: apiKey.companies?.name ?? "",
      } satisfies CompanyAuth,
    };
  },
  { required: false }
);

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
