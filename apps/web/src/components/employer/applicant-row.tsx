"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { getCvDownloadUrl, updateApplicationStatus } from "@/lib/actions/employer";
import type { Database, Tables } from "@/lib/database.types";
import { APPLICATION_STATUS_LABELS, initials, timeAgo } from "@/lib/format";

type ApplicantRowProps = {
  application: Tables<"applications">;
  candidateName: string;
  candidateProfile: {
    headline: string;
    location: string;
    skills: string[];
  } | null;
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  batch: "Batch",
  auto: "Auto-apply",
};

export function ApplicantRow({ application, candidateName, candidateProfile }: ApplicantRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(status: Database["public"]["Enums"]["application_status"]) {
    startTransition(async () => {
      const result = await updateApplicationStatus(application.id, status);
      if (result.error) toast.error(result.error);
      else router.refresh();
    });
  }

  function downloadCv() {
    if (!application.cv_path) return;
    startTransition(async () => {
      const result = await getCvDownloadUrl(application.cv_path!);
      if (result.error || !result.url) toast.error(result.error ?? "Download failed");
      else window.open(result.url, "_blank");
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(candidateName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{candidateName}</p>
            <p className="text-xs text-muted-foreground">
              {[candidateProfile?.headline, candidateProfile?.location]
                .filter(Boolean)
                .join(" · ") || "No profile details"}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono">
        {application.match_score != null ? `${application.match_score}%` : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{SOURCE_LABELS[application.source]}</Badge>
      </TableCell>
      <TableCell>
        <Select
          value={application.status}
          onValueChange={(value) =>
            changeStatus(value as Database["public"]["Enums"]["application_status"])
          }
          disabled={pending}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {application.cv_path && (
            <Button variant="outline" size="sm" onClick={downloadCv} disabled={pending}>
              <FileText className="size-3.5" /> CV
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(application.created_at)}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
