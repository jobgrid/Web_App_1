import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

import { ChatRequestList } from "@/components/chat/chat-request-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { initials, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isEmployer = profile?.role === "employer";

  const [{ data: conversations }, { data: requests }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*, jobs(title), companies(name), profiles!conversations_candidate_id_fkey(full_name)")
      .order("last_message_at", { ascending: false }),
    supabase
      .from("chat_requests")
      .select("*, jobs(title), companies(name), profiles!chat_requests_candidate_id_fkey(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  const pendingRequests = (requests ?? []).filter((request) => request.status === "pending");
  const otherRequests = (requests ?? []).filter((request) => request.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
        <p className="text-sm text-muted-foreground">
          {isEmployer
            ? "Accept a request to unlock the conversation."
            : "Conversations unlock when the employer accepts your request."}
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <ChatRequestList
          requests={pendingRequests.map((request) => ({
            id: request.id,
            message: request.message,
            createdAt: request.created_at,
            candidateName: request.profiles?.full_name ?? "Candidate",
            companyName: request.companies?.name ?? "Company",
            jobTitle: request.jobs?.title ?? null,
          }))}
          isEmployer={isEmployer}
        />
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Conversations</h2>
        {(conversations ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No conversations yet.
                {!isEmployer && (
                  <>
                    {" "}
                    <Link href="/jobs" className="text-primary hover:underline">
                      Find a job
                    </Link>{" "}
                    and request a chat with the employer.
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          (conversations ?? []).map((conversation) => {
            const otherName = isEmployer
              ? conversation.profiles?.full_name ?? "Candidate"
              : conversation.companies?.name ?? "Company";
            return (
              <Link key={conversation.id} href={`/chat/${conversation.id}`} className="block">
                <Card className="py-0 transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {initials(otherName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{otherName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.jobs?.title ?? "General chat"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(conversation.last_message_at)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {otherRequests.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Past requests</h2>
          {otherRequests.map((request) => (
            <Card key={request.id} className="py-0">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {isEmployer
                      ? request.profiles?.full_name ?? "Candidate"
                      : request.companies?.name ?? "Company"}
                    {request.jobs?.title && (
                      <span className="text-muted-foreground"> · {request.jobs.title}</span>
                    )}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    request.status === "accepted"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive"
                  }
                >
                  {request.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
