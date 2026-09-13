"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Layers, Zap } from "lucide-react";
import { toast } from "sonner";

import { JobCard } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { batchApply } from "@/lib/actions/candidate";
import type { Tables } from "@/lib/database.types";

type JobWithCompany = Tables<"jobs"> & {
  companies: Pick<Tables<"companies">, "name" | "logo_url" | "brand_color"> | null;
};

type MatchedJobsListProps = {
  jobs: JobWithCompany[];
  scores: Record<string, number>;
  appliedIds: string[];
  autoApply: boolean;
};

export function MatchedJobsList({ jobs, scores, appliedIds, autoApply }: MatchedJobsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const applied = new Set(appliedIds);
  const selectable = jobs.filter((job) => !applied.has(job.id));

  function toggle(jobId: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function submitBatch() {
    startTransition(async () => {
      const result = await batchApply([...selected]);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Your matched jobs</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by AI match score against your CV.
            {autoApply && (
              <Badge variant="secondary" className="ml-2 gap-1 bg-emerald-500/10 text-emerald-600">
                <Zap className="size-3" /> Auto-apply on
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectable.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected(
                  selected.size === selectable.length
                    ? new Set()
                    : new Set(selectable.map((job) => job.id))
                )
              }
            >
              {selected.size === selectable.length ? "Clear selection" : "Select all"}
            </Button>
          )}
          <Button size="sm" onClick={submitBatch} disabled={selected.size === 0 || pending}>
            <Layers className="size-4" />
            {pending ? "Applying…" : `Batch apply (${selected.size})`}
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No live jobs right now — check back soon or{" "}
            <Link href="/jobs" className="text-primary hover:underline">
              browse all jobs
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-start gap-3">
              <div className="pt-6">
                {applied.has(job.id) ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <Checkbox
                    checked={selected.has(job.id)}
                    onCheckedChange={() => toggle(job.id)}
                    aria-label={`Select ${job.title}`}
                  />
                )}
              </div>
              <div className="flex-1">
                <JobCard
                  job={job}
                  company={job.companies}
                  matchScore={scores[job.id]}
                  actions={
                    applied.has(job.id) ? (
                      <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="size-3" /> Applied
                      </Badge>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/jobs/${job.slug}`}>View & apply</Link>
                      </Button>
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
