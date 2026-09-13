import Link from "next/link";
import { Check, Clock, MapPin, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";
import { WORK_TYPE_LABELS, formatSalary, initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type JobCardProps = {
  job: Tables<"jobs">;
  company: Pick<Tables<"companies">, "name" | "logo_url" | "brand_color"> | null;
  matchScore?: number;
  actions?: React.ReactNode;
};

export function JobCard({ job, company, matchScore, actions }: JobCardProps) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period, job.currency);
  const branded = job.tier !== "basic";
  const premium = job.tier === "premium";

  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md",
        premium && "ring-1 ring-primary/30"
      )}
    >
      {branded && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: company?.brand_color ?? "#6366f1" }}
        />
      )}
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 rounded-lg">
              {branded && company?.logo_url ? (
                <AvatarImage src={company.logo_url} alt={company.name} />
              ) : null}
              <AvatarFallback
                className="rounded-lg text-sm font-semibold"
                style={
                  branded
                    ? { backgroundColor: `${company?.brand_color ?? "#6366f1"}20`, color: company?.brand_color ?? "#6366f1" }
                    : undefined
                }
              >
                {initials(company?.name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link
                href={`/jobs/${job.slug}`}
                className="font-semibold leading-tight hover:underline"
              >
                {job.title}
              </Link>
              <p className="text-sm text-muted-foreground">{company?.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {premium && (
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="size-3" /> Featured
              </Badge>
            )}
            {matchScore != null && (
              <Badge
                variant="secondary"
                className={cn(
                  "font-mono",
                  matchScore >= 75
                    ? "bg-emerald-500/10 text-emerald-600"
                    : matchScore >= 50
                      ? "bg-amber-500/10 text-amber-600"
                      : "text-muted-foreground"
                )}
              >
                {matchScore}% match
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {job.is_remote ? `Remote${job.location ? ` · ${job.location}` : ""}` : job.location}
          </span>
          <span>{WORK_TYPE_LABELS[job.work_type]}</span>
          {salary && <span className="font-medium text-foreground">{salary}</span>}
        </div>

        {branded && job.highlights.length > 0 && (
          <ul className="space-y-1">
            {job.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                {highlight}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {job.published_at ? timeAgo(job.published_at) : "Draft"}
          </span>
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
