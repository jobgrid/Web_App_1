"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarPlus, ExternalLink, MoreHorizontal, Rocket, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { closeJob, extendJob, publishDraft } from "@/lib/actions/employer";
import type { Database } from "@/lib/database.types";

type JobRowActionsProps = {
  jobId: string;
  slug: string;
  status: Database["public"]["Enums"]["job_status"];
  tier: Database["public"]["Enums"]["ad_tier"];
};

export function JobRowActions({ jobId, slug, status, tier }: JobRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Job actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "active" && (
          <DropdownMenuItem asChild>
            <Link href={`/jobs/${slug}`} target="_blank">
              <ExternalLink className="size-4" /> View live ad
            </Link>
          </DropdownMenuItem>
        )}
        {status === "draft" && (
          <DropdownMenuItem onClick={() => run(() => publishDraft(jobId, tier))}>
            <Rocket className="size-4" /> Publish (uses 1 credit)
          </DropdownMenuItem>
        )}
        {(status === "active" || status === "expired") && (
          <DropdownMenuItem onClick={() => run(() => extendJob(jobId))}>
            <CalendarPlus className="size-4" /> Extend expiry
          </DropdownMenuItem>
        )}
        {status === "active" && (
          <DropdownMenuItem variant="destructive" onClick={() => run(() => closeJob(jobId))}>
            <XCircle className="size-4" /> Close job
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
