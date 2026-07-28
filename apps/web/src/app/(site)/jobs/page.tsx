import type { Metadata } from "next";
import { SearchX } from "lucide-react";

import { JobCard } from "@/components/jobs/job-card";
import { JobFilters } from "@/components/jobs/job-filters";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Browse jobs" };

type SearchParams = {
  q?: string;
  location?: string;
  type?: string;
  category?: string;
  remote?: string;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select("*, companies(name, logo_url, brand_color)")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (params.q) {
    query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }
  if (params.location) query = query.ilike("location", `%${params.location}%`);
  if (params.type && params.type !== "all") {
    query = query.eq("work_type", params.type as never);
  }
  if (params.category && params.category !== "all") {
    query = query.eq("category", params.category);
  }
  if (params.remote === "true") query = query.eq("is_remote", true);

  const { data: jobs } = await query
    .order("tier", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  // Match scores for signed-in candidates.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let scores = new Map<string, number>();
  if (user) {
    const { data: matches } = await supabase.rpc("matched_jobs_for_me");
    scores = new Map((matches ?? []).map((match) => [match.job_id, match.score]));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Browse jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {jobs?.length ?? 0} live role{(jobs?.length ?? 0) === 1 ? "" : "s"} on the grid.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <JobFilters
          defaults={{
            q: params.q ?? "",
            location: params.location ?? "",
            type: params.type ?? "all",
            category: params.category ?? "all",
            remote: params.remote === "true",
          }}
        />
        <div className="space-y-4">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                company={job.companies}
                matchScore={scores.get(job.id)}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <SearchX className="size-10 text-muted-foreground" />
                <p className="font-medium">No jobs match those filters</p>
                <p className="text-sm text-muted-foreground">
                  Try widening your search or clearing a filter.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
