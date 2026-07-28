import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChatThread } from "@/components/chat/chat-thread";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, jobs(title, slug), companies(name), profiles!conversations_candidate_id_fkey(full_name)")
    .eq("id", conversationId)
    .single();
  if (!conversation) notFound();

  const isCandidate = conversation.candidate_id === user!.id;
  const otherName = isCandidate
    ? conversation.companies?.name ?? "Company"
    : conversation.profiles?.full_name ?? "Candidate";

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at");

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-3xl flex-col px-4">
      <div className="flex items-center gap-3 border-b py-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/chat" aria-label="Back to chats">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(otherName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{otherName}</p>
          {conversation.jobs && (
            <Link
              href={`/jobs/${conversation.jobs.slug}`}
              className="truncate text-xs text-muted-foreground hover:underline"
            >
              {conversation.jobs.title}
            </Link>
          )}
        </div>
      </div>

      <ChatThread
        conversationId={conversationId}
        currentUserId={user!.id}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
