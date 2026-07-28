import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  FileUp,
  MessageSquare,
  Mic,
  Sparkles,
  Zap,
} from "lucide-react";

import { JobCard } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, companies(name, logo_url, brand_color)")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("tier", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, oklch(0.95 0.04 277), transparent 60%), radial-gradient(600px circle at 90% 20%, oklch(0.96 0.03 300), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="size-3.5 text-primary" />
            The newest AI job board
          </Badge>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
            Upload your CV.
            <br />
            See your matches.
            <br />
            <span className="text-primary">Chat your way in.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            JobGrid scores every live job against your CV, lets you apply in
            batches, and connects you directly with the hiring manager in
            real-time chat — voice notes included.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Upload your CV <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup?role=employer">Post a job from $49</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Zap className="size-4 text-primary" /> AI match scores on every job
            </span>
            <span className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" /> Direct chat with employers
            </span>
            <span className="flex items-center gap-2">
              <Mic className="size-4 text-primary" /> Voice messages
            </span>
          </div>
        </div>
      </section>

      {/* Fresh jobs */}
      {jobs && jobs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Fresh on the grid</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The latest roles from companies hiring right now.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">
                All jobs <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} company={job.companies} />
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Built around the chat, like Boss — priced nothing like Seek
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                  <FileUp className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold">1. Upload your CV</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI reads your CV, extracts your skills and instantly
                  scores every live job for you. Apply one by one, in batches,
                  or switch on auto-apply.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                  <MessageSquare className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold">2. Request a chat</h3>
                <p className="text-sm text-muted-foreground">
                  Skip the black hole. Send a chat request straight to the
                  employer — they get an email, accept, and the conversation
                  unlocks in real time on web and mobile.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                  <BarChart3 className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold">3. Hire with data</h3>
                <p className="text-sm text-muted-foreground">
                  Employers see live views, clicks and applies per ad, manage
                  applicants in one place, and sync jobs from JobAdder or
                  Bullhorn via our API & MCP server.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Job ads from <span className="text-primary">$49</span> — up to 85% cheaper than the big boards
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Basic, Branded and Premium ads with clear expiry dates. Buy one at a
          time or save with packs of 5 and 10.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/pricing">
            See pricing <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
