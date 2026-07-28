import Link from "next/link";
import type { Metadata } from "next";

import { JobRowActions } from "@/components/employer/job-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_LABELS, daysUntil, timeAgo } from "@/lib/format";
import { requireCompany } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Jobs & applicants" };

export default async function EmployerJobsPage() {
  const { supabase, company } = await requireCompany();

  const [{ data: jobs }, { data: applications }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase.from("applications").select("id, job_id"),
  ]);

  const applicationCounts = new Map<string, number>();
  for (const application of applications ?? []) {
    applicationCounts.set(
      application.job_id,
      (applicationCounts.get(application.job_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Jobs & applicants</h1>
          <p className="text-sm text-muted-foreground">
            Manage your ads, applicants and expiry dates.
          </p>
        </div>
        <Button asChild>
          <Link href="/employer/jobs/new">Post a job</Link>
        </Button>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Applicants</TableHead>
              <TableHead className="text-right">Posted</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jobs ?? []).map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  <Link href={`/employer/jobs/${job.id}`} className="hover:underline">
                    {job.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{TIER_LABELS[job.tier]}</Badge>
                </TableCell>
                <TableCell>
                  {job.status === "active" && job.expires_at ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                      Live · {daysUntil(job.expires_at)}d left
                    </Badge>
                  ) : (
                    <Badge variant="outline">{job.status}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {job.source === "jobgrid" ? "JobGrid" : job.source}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {applicationCounts.get(job.id) ?? 0}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {job.published_at ? timeAgo(job.published_at) : "—"}
                </TableCell>
                <TableCell>
                  <JobRowActions
                    jobId={job.id}
                    slug={job.slug}
                    status={job.status}
                    tier={job.tier}
                  />
                </TableCell>
              </TableRow>
            ))}
            {(jobs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No jobs yet. Your first Basic ad is free —{" "}
                  <Link href="/employer/jobs/new" className="text-primary hover:underline">
                    post one now
                  </Link>
                  .
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
