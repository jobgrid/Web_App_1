import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, MessageSquare, MousePointerClick, Send } from "lucide-react";

import { ApplicantRow } from "@/components/employer/applicant-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_LABELS, daysUntil } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function EmployerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).single();
  if (!job) notFound();

  const [{ data: applications }, { data: stats }] = await Promise.all([
    supabase
      .from("applications")
      .select("*, profiles(full_name, email)")
      .eq("job_id", job.id)
      .order("match_score", { ascending: false, nullsFirst: false }),
    supabase.rpc("company_job_stats", { p_company_id: job.company_id }),
  ]);

  const jobStats = (stats ?? []).find((row) => row.job_id === job.id);
  const candidateIds = (applications ?? []).map((application) => application.candidate_id);
  const { data: candidateProfiles } = candidateIds.length
    ? await supabase
        .from("candidate_profiles")
        .select("user_id, headline, location, skills")
        .in("user_id", candidateIds)
    : { data: [] };
  const profilesById = new Map(
    (candidateProfiles ?? []).map((profile) => [profile.user_id, profile])
  );

  const statCards = [
    { label: "Views", value: Number(jobStats?.views ?? 0), icon: Eye },
    { label: "Clicks", value: Number(jobStats?.clicks ?? 0), icon: MousePointerClick },
    { label: "Applies", value: Number(jobStats?.applies ?? 0), icon: Send },
    { label: "Chats", value: Number(jobStats?.chats ?? 0), icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/employer/jobs">
            <ArrowLeft className="size-4" /> All jobs
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
          <Badge variant="secondary">{TIER_LABELS[job.tier]}</Badge>
          {job.status === "active" && job.expires_at ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              Live · {daysUntil(job.expires_at)}d left
            </Badge>
          ) : (
            <Badge variant="outline">{job.status}</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="gap-1 py-4">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-mono text-2xl font-bold">{card.value}</p>
              </div>
              <card.icon className="size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">CV / Applied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(applications ?? []).map((application) => (
              <ApplicantRow
                key={application.id}
                application={application}
                candidateName={application.profiles?.full_name ?? "Candidate"}
                candidateProfile={profilesById.get(application.candidate_id) ?? null}
              />
            ))}
          </TableBody>
        </Table>
        {(applications ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No applications yet. Candidates with matching CVs will see this ad in
            their feed.
          </p>
        )}
      </Card>
    </div>
  );
}
