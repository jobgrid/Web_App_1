"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type Message = Tables<"messages">;

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((message: Message) => {
    setMessages((previous) =>
      previous.some((item) => item.id === message.id) ? previous : [...previous, message]
    );
  }, []);

  // Realtime: new messages arrive instantly.
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => appendMessage(payload.new as Message)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, appendMessage]);

  // Signed URLs for voice notes.
  useEffect(() => {
    for (const message of messages) {
      if (message.kind === "voice" && message.audio_path && !audioUrls[message.audio_path]) {
        supabase.storage
          .from("voice")
          .createSignedUrl(message.audio_path, 3600)
          .then(({ data }) => {
            if (data?.signedUrl) {
              setAudioUrls((previous) => ({
                ...previous,
                [message.audio_path!]: data.signedUrl,
              }));
            }
          });
      }
    }
  }, [messages, audioUrls, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendText() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setInput(body);
    } else if (data) {
      appendMessage(data);
    }
    setSending(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.onstart = () => {
        recordStartRef.current = Date.now();
      };
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) return;
        await sendVoiceNote(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function sendVoiceNote(blob: Blob) {
    setSending(true);
    const duration = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
    const path = `${conversationId}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("voice")
      .upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (uploadError) {
      toast.error(uploadError.message);
      setSending(false);
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        kind: "voice",
        body: "Voice message",
        audio_path: path,
        duration_seconds: duration,
      })
      .select()
      .single();
    if (error) toast.error(error.message);
    else if (data) appendMessage(data);
    setSending(false);
  }

  return (
    <>
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chat unlocked — say hello 👋
          </p>
        )}
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  mine
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted"
                )}
              >
                {message.kind === "voice" && message.audio_path ? (
                  <div className="space-y-1">
                    {audioUrls[message.audio_path] ? (
                      <audio controls src={audioUrls[message.audio_path]} className="max-w-full" />
                    ) : (
                      <p className="italic opacity-80">Loading voice note…</p>
                    )}
                    <p className={cn("text-xs", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      🎙 {message.duration_seconds ?? 0}s
                    </p>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                )}
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    mine ? "text-primary-foreground/60" : "text-muted-foreground"
                  )}
                >
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t py-3">
        <Button
          variant={recording ? "destructive" : "outline"}
          size="icon"
          onClick={recording ? stopRecording : startRecording}
          disabled={sending}
          aria-label={recording ? "Stop recording" : "Record voice message"}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </Button>
        {recording ? (
          <div className="flex flex-1 items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <span className="size-2 animate-pulse rounded-full bg-destructive" />
            Recording… tap ■ to send
          </div>
        ) : (
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendText();
              }
            }}
            placeholder="Type a message…"
            disabled={sending}
          />
        )}
        <Button onClick={sendText} disabled={sending || recording || !input.trim()} size="icon" aria-label="Send">
          <Send className="size-4" />
        </Button>
      </div>
    </>
  );
}
