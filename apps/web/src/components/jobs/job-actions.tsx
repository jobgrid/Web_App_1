"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { applyToJob, requestChat } from "@/lib/actions/candidate";
import { recordJobEvent } from "@/lib/actions/events";

type JobActionsProps = {
  jobId: string;
  role: "candidate" | "employer" | null;
  applied: boolean;
  chatRequested: boolean;
};

export function JobActions({ jobId, role, applied, chatRequested }: JobActionsProps) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [pending, startTransition] = useTransition();

  if (role === "employer") return null;

  if (!role) {
    return (
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Sign up to apply</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  function submitApply() {
    startTransition(async () => {
      const result = await applyToJob(jobId, coverNote);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setApplyOpen(false);
        router.refresh();
      }
    });
  }

  function submitChat() {
    startTransition(async () => {
      const result = await requestChat(jobId, chatMessage);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        setChatOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {applied ? (
        <Button size="lg" disabled variant="secondary">
          <CheckCircle2 className="size-4 text-emerald-600" /> Applied
        </Button>
      ) : (
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={() => recordJobEvent(jobId, "click")}>
              <Send className="size-4" /> Apply now
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for this job</DialogTitle>
              <DialogDescription>
                Your CV and profile are attached automatically. Add an optional note.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Why are you a great fit? (optional)"
              value={coverNote}
              onChange={(event) => setCoverNote(event.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button onClick={submitApply} disabled={pending}>
                {pending ? "Submitting…" : "Submit application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {chatRequested ? (
        <Button size="lg" variant="outline" asChild>
          <Link href="/chat">
            <MessageSquare className="size-4" /> Chat requested
          </Link>
        </Button>
      ) : (
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogTrigger asChild>
            <Button size="lg" variant="outline">
              <MessageSquare className="size-4" /> Chat with employer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a chat</DialogTitle>
              <DialogDescription>
                The employer gets an email notification. Once they accept, the
                conversation unlocks in real time.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Hi! I'd love to learn more about this role…"
              value={chatMessage}
              onChange={(event) => setChatMessage(event.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button onClick={submitChat} disabled={pending || !chatMessage.trim()}>
                {pending ? "Sending…" : "Send chat request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
