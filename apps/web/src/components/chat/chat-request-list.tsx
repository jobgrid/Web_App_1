"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { respondToChatRequest } from "@/lib/actions/employer";
import { initials, timeAgo } from "@/lib/format";

type ChatRequestItem = {
  id: string;
  message: string;
  createdAt: string;
  candidateName: string;
  companyName: string;
  jobTitle: string | null;
};

export function ChatRequestList({
  requests,
  isEmployer,
}: {
  requests: ChatRequestItem[];
  isEmployer: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function respond(requestId: string, accept: boolean) {
    startTransition(async () => {
      const result = await respondToChatRequest(requestId, accept);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success);
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-primary/30 bg-accent/30">
      <CardHeader>
        <CardTitle className="text-sm">
          {isEmployer
            ? `${requests.length} pending chat request${requests.length === 1 ? "" : "s"}`
            : "Waiting on employer"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(isEmployer ? request.candidateName : request.companyName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {isEmployer ? request.candidateName : request.companyName}
                {request.jobTitle && (
                  <span className="text-muted-foreground"> · {request.jobTitle}</span>
                )}
              </p>
              {request.message && (
                <p className="truncate text-sm text-muted-foreground">“{request.message}”</p>
              )}
              <p className="text-xs text-muted-foreground">{timeAgo(request.createdAt)}</p>
            </div>
            {isEmployer && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respond(request.id, true)}
                  disabled={pending}
                >
                  <Check className="size-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond(request.id, false)}
                  disabled={pending}
                >
                  <X className="size-3.5" /> Decline
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
