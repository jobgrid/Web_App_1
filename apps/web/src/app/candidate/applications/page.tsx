import Link from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APPLICATION_STATUS_LABELS, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My applications" };

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-secondary text-secondary-foreground",
  viewed: "bg-blue-500/10 text-blue-600",
  shortlisted: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-destructive/10 text-destructive",
  hired: "bg-primary/10 text-primary",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  batch: "Batch",
  auto: "Auto-apply",
};

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: applications } = await supabase
    .from("applications")
    .select("*, jobs(title, slug, companies(name))")
    .eq("candidate_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My applications</h1>
        <p className="text-sm text-muted-foreground">
          {applications?.length ?? 0} application{(applications?.length ?? 0) === 1 ? "" : "s"} so far.
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            You haven&apos;t applied to anything yet.{" "}
            <Link href="/candidate" className="text-primary hover:underline">
              See your matched jobs
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>How</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">
                    {application.jobs ? (
                      <Link href={`/jobs/${application.jobs.slug}`} className="hover:underline">
                        {application.jobs.title}
                      </Link>
                    ) : (
                      "(removed)"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {application.jobs?.companies?.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {application.match_score != null ? `${application.match_score}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {SOURCE_LABELS[application.source]}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(STATUS_STYLES[application.status])}
                    >
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {timeAgo(application.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
