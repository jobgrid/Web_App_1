import Link from "next/link";
import type { Metadata } from "next";
import { FileUp } from "lucide-react";

import { MatchedJobsList } from "@/components/candidate/matched-jobs-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Matched jobs" };

export default async function CandidateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("cv_path, skills, auto_apply")
    .eq("user_id", user!.id)
    .single();

  if (!candidateProfile?.cv_path) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary/10">
            <FileUp className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Upload your CV to unlock matches</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Our AI reads your CV, extracts your skills and scores every live
              job for you — then you can apply in one click or in batches.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/candidate/profile">Upload CV</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { data: matches } = await supabase.rpc("matched_jobs_for_me");
  const jobIds = (matches ?? []).map((match) => match.job_id);
  const scores = new Map((matches ?? []).map((match) => [match.job_id, match.score]));

  const [{ data: jobs }, { data: applications }] = await Promise.all([
    jobIds.length > 0
      ? supabase
          .from("jobs")
          .select("*, companies(name, logo_url, brand_color)")
          .in("id", jobIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("applications").select("job_id").eq("candidate_id", user!.id),
  ]);

  const appliedIds = new Set((applications ?? []).map((application) => application.job_id));
  const sortedJobs = (jobs ?? [])
    .slice()
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

  return (
    <MatchedJobsList
      jobs={sortedJobs}
      scores={Object.fromEntries(scores)}
      appliedIds={[...appliedIds]}
      autoApply={candidateProfile.auto_apply}
    />
  );
}
