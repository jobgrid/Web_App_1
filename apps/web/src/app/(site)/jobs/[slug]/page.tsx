import { notFound } from "next/navigation";
import { after } from "next/server";
import { Building2, Clock, Globe, MapPin, Sparkles } from "lucide-react";

import { JobActions } from "@/components/jobs/job-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  WORK_TYPE_LABELS,
  daysUntil,
  formatSalary,
  initials,
  timeAgo,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, companies(*)")
    .eq("slug", slug)
    .single();

  if (!job || !job.companies) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewerState: {
    role: "candidate" | "employer" | null;
    applied: boolean;
    chatRequested: boolean;
    matchScore: number | null;
  } = { role: null, applied: false, chatRequested: false, matchScore: null };

  if (user) {
    const [{ data: profile }, { data: application }, { data: chatRequest }] =
      await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).single(),
        supabase
          .from("applications")
          .select("id")
          .eq("job_id", job.id)
          .eq("candidate_id", user.id)
          .maybeSingle(),
        supabase
          .from("chat_requests")
          .select("id")
          .eq("job_id", job.id)
          .eq("candidate_id", user.id)
          .maybeSingle(),
      ]);
    let matchScore: number | null = null;
    if (profile?.role === "candidate") {
      const { data: matches } = await supabase.rpc("matched_jobs_for_me");
      matchScore = matches?.find((match) => match.job_id === job.id)?.score ?? null;
    }
    viewerState = {
      role: profile?.role ?? null,
      applied: Boolean(application),
      chatRequested: Boolean(chatRequest),
      matchScore,
    };
  }

  // Record the view without blocking the response.
  after(async () => {
    const sb = await createClient();
    await sb.from("job_events").insert({
      job_id: job.id,
      event_type: "view",
      actor_id: user?.id ?? null,
    });
  });

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period, job.currency);
  const company = job.companies;
  const branded = job.tier !== "basic";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      {branded && (
        <div
          className="mb-6 h-1.5 rounded-full"
          style={{ backgroundColor: company.brand_color }}
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-xl">
            {branded && company.logo_url ? (
              <AvatarImage src={company.logo_url} alt={company.name} />
            ) : null}
            <AvatarFallback
              className="rounded-xl text-lg font-semibold"
              style={
                branded
                  ? { backgroundColor: `${company.brand_color}20`, color: company.brand_color }
                  : undefined
              }
            >
              {initials(company.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground">{company.name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {job.tier === "premium" && (
            <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="size-3" /> Featured
            </Badge>
          )}
          {viewerState.matchScore != null && (
            <Badge variant="secondary" className="font-mono text-sm">
              {viewerState.matchScore}% match
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" />
          {job.is_remote ? `Remote${job.location ? ` · ${job.location}` : ""}` : job.location}
        </span>
        <span>{WORK_TYPE_LABELS[job.work_type]}</span>
        {salary && <span className="font-medium text-foreground">{salary}</span>}
        <span className="flex items-center gap-1.5">
          <Clock className="size-4" />
          {job.published_at ? `Posted ${timeAgo(job.published_at)}` : "Draft"}
          {job.expires_at && ` · closes in ${daysUntil(job.expires_at)} days`}
        </span>
      </div>

      <div className="mt-6">
        <JobActions
          jobId={job.id}
          role={viewerState.role}
          applied={viewerState.applied}
          chatRequested={viewerState.chatRequested}
        />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          {job.highlights.length > 0 && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="space-y-2">
                {job.highlights.map((highlight) => (
                  <p key={highlight} className="flex items-start gap-2 text-sm">
                    <span className="text-emerald-600">✓</span> {highlight}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
          <div className="space-y-4 text-sm leading-relaxed">
            {job.description.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          {job.skills.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="mb-3 text-sm font-semibold">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" /> About {company.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {company.tagline && <p className="font-medium text-foreground">{company.tagline}</p>}
            {company.description && <p>{company.description}</p>}
            {company.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {company.location}
              </p>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="size-3.5" /> Website
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
