import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Eye, MessageSquare, MousePointerClick, Send } from "lucide-react";

import { AnalyticsChart } from "@/components/employer/analytics-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_LABELS, daysUntil, lastNDaysIso } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Employer dashboard" };

export default async function EmployerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", user!.id)
    .single();

  const [{ data: stats }, { data: daily }, { data: jobs }] = await Promise.all([
    supabase.rpc("company_job_stats", { p_company_id: company!.id }),
    supabase.rpc("company_daily_events", { p_company_id: company!.id, p_days: 30 }),
    supabase
      .from("jobs")
      .select("id, title, slug, tier, status, expires_at")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false }),
  ]);

  // Continuous 30-day window for the chart (computed server-side).
  const chartDays = lastNDaysIso(30);

  const totals = (stats ?? []).reduce(
    (acc, row) => ({
      views: acc.views + Number(row.views),
      clicks: acc.clicks + Number(row.clicks),
      applies: acc.applies + Number(row.applies),
      chats: acc.chats + Number(row.chats),
    }),
    { views: 0, clicks: 0, applies: 0, chats: 0 }
  );
  const statsByJob = new Map((stats ?? []).map((row) => [row.job_id, row]));
  const activeJobs = (jobs ?? []).filter((job) => job.status === "active");

  const summaryCards = [
    { label: "Views", value: totals.views, icon: Eye },
    { label: "Clicks", value: totals.clicks, icon: MousePointerClick },
    { label: "Applications", value: totals.applies, icon: Send },
    { label: "Chat requests", value: totals.chats, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{company!.name}</h1>
          <p className="text-sm text-muted-foreground">
            {activeJobs.length} live ad{activeJobs.length === 1 ? "" : "s"} · last 30 days below
          </p>
        </div>
        <Button asChild>
          <Link href="/employer/jobs/new">Post a job</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="gap-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-mono text-3xl font-bold tracking-tight">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <BarChart3 className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Activity — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart daily={daily ?? []} days={chartDays} />
        </CardContent>
      </Card>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Applies</TableHead>
              <TableHead className="text-right">Chats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jobs ?? []).map((job) => {
              const jobStats = statsByJob.get(job.id);
              return (
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
                      <span className="text-sm text-muted-foreground">
                        {daysUntil(job.expires_at)}d left
                      </span>
                    ) : (
                      <Badge variant="outline">{job.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">{Number(jobStats?.views ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(jobStats?.clicks ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(jobStats?.applies ?? 0)}</TableCell>
                  <TableCell className="text-right font-mono">{Number(jobStats?.chats ?? 0)}</TableCell>
                </TableRow>
              );
            })}
            {(jobs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No jobs yet — post your first ad (it&apos;s free).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
