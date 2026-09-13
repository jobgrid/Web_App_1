import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassButton, GlassCard } from "../components/Glass";
import { Segmented } from "../components/Segmented";
import { toast } from "../components/Toast";
import { getChatRequests, getConversations, respondToChatRequest } from "../lib/data";
import { timeAgo } from "../lib/format";
import { supabase, type ChatRequest, type Conversation, type Role } from "../lib/supabase";
import { colors } from "../theme";

export function ChatsScreen({
  userId,
  role,
  onOpenConversation,
  onPendingCount,
}: {
  userId: string;
  role: Role;
  onOpenConversation: (conversation: Conversation) => void;
  onPendingCount?: (count: number) => void;
}) {
  const [segment, setSegment] = useState<"chats" | "requests">("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [conversationRows, requestRows] = await Promise.all([
      getConversations(),
      getChatRequests(),
    ]);
    setConversations(conversationRows);
    setRequests(requestRows);
    onPendingCount?.(
      role === "employer"
        ? requestRows.filter((request) => request.status === "pending").length
        : 0
    );
    setRefreshing(false);
  }, [role, onPendingCount]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("chats-hub")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_requests" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function decide(request: ChatRequest, accept: boolean) {
    setDecidingId(request.id);
    const { error } = await respondToChatRequest(request.id, accept);
    setDecidingId(null);
    if (error) toast(error, "error");
    else {
      toast(
        accept
          ? `Chat with ${request.profiles?.full_name ?? "candidate"} unlocked`
          : "Request declined"
      );
      load();
    }
  }

  const pending = requests.filter((request) => request.status === "pending");
  const decided = requests.filter((request) => request.status !== "pending");

  const renderConversation = (conversation: Conversation) => {
    const isCandidate = conversation.candidate_id === userId;
    const otherName = isCandidate
      ? conversation.companies?.name ?? "Company"
      : conversation.profiles?.full_name ?? "Candidate";
    const preview = conversation.preview;
    const previewText = preview
      ? preview.kind === "voice"
        ? "🎙 Voice note"
        : preview.body
      : "Chat unlocked — say hello!";
    const mine = preview?.sender_id === userId;
    return (
      <GlassCard
        key={conversation.id}
        style={styles.chatRow}
        onPress={() => onOpenConversation(conversation)}
      >
        <Avatar
          name={otherName}
          size={50}
          color={isCandidate ? conversation.companies?.brand_color : undefined}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.chatTime}>{timeAgo(conversation.last_message_at)}</Text>
          </View>
          <Text style={styles.chatJob} numberOfLines={1}>
            {conversation.jobs?.title ?? "General chat"}
          </Text>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {mine ? "You: " : ""}
            {previewText}
          </Text>
        </View>
      </GlassCard>
    );
  };

  const renderRequest = (request: ChatRequest) => {
    const isEmployer = role === "employer";
    const name = isEmployer
      ? request.profiles?.full_name ?? "Candidate"
      : request.companies?.name ?? "Company";
    return (
      <GlassCard key={request.id} style={styles.requestCard}>
        <View style={styles.chatTopRow}>
          <View style={styles.requestHead}>
            <Avatar name={name} size={42} color={isEmployer ? undefined : request.companies?.brand_color} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={styles.chatName}>{name}</Text>
              <Text style={styles.chatJob} numberOfLines={1}>
                {request.jobs?.title ?? "General"} · {timeAgo(request.created_at)}
              </Text>
            </View>
          </View>
          {request.status !== "pending" && (
            <Text
              style={[
                styles.requestStatus,
                { color: request.status === "accepted" ? colors.success : colors.danger },
              ]}
            >
              {request.status}
            </Text>
          )}
        </View>
        {!!request.message && (
          <View style={styles.requestBubble}>
            <Text style={styles.requestMessage}>“{request.message}”</Text>
          </View>
        )}
        {isEmployer && request.status === "pending" && (
          <View style={styles.requestActions}>
            <GlassButton
              small
              label={decidingId === request.id ? "…" : "Accept & unlock"}
              active
              icon={<Ionicons name="checkmark" size={15} color="#fff" />}
              onPress={() => decide(request, true)}
              style={{ flex: 1 }}
            />
            <GlassButton
              small
              label="Decline"
              danger
              onPress={() => decide(request, false)}
              style={{ flex: 1 }}
            />
          </View>
        )}
        {!isEmployer && request.status === "pending" && (
          <View style={styles.waitingRow}>
            <Ionicons name="hourglass-outline" size={14} color={colors.amber} />
            <Text style={styles.waitingText}>Waiting for {name} to accept</Text>
          </View>
        )}
      </GlassCard>
    );
  };

  return (
    <FlatList
      data={segment === "chats" ? conversations : []}
      keyExtractor={(conversation) => conversation.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          <Segmented
            options={[
              { key: "chats", label: "Chats", badge: conversations.length || undefined },
              { key: "requests", label: "Requests", badge: pending.length || undefined },
            ]}
            value={segment}
            onChange={(key) => setSegment(key as "chats" | "requests")}
          />
          {segment === "requests" && (
            <View style={{ gap: 12 }}>
              {pending.length === 0 && decided.length === 0 && (
                <Text style={styles.empty}>
                  {role === "employer"
                    ? "No chat requests yet. They'll appear when candidates reach out."
                    : "No requests yet. Request a chat from any job ad."}
                </Text>
              )}
              {pending.map(renderRequest)}
              {decided.map(renderRequest)}
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        segment === "chats" ? (
          <Text style={styles.empty}>
            {refreshing
              ? "Loading…"
              : role === "employer"
                ? "No active chats. Accept a request to unlock a conversation."
                : "No active chats yet — request a chat and it unlocks once accepted."}
          </Text>
        ) : null
      }
      renderItem={({ item }) => renderConversation(item)}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 130, gap: 11 },
  header: { gap: 13, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -0.6 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 34, fontSize: 14, lineHeight: 20 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  chatTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatName: { fontSize: 15.5, fontWeight: "800", color: colors.text, flexShrink: 1 },
  chatTime: { fontSize: 11.5, color: colors.faint, fontWeight: "600" },
  chatJob: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  chatPreview: { fontSize: 13, color: colors.muted },
  requestCard: { gap: 10 },
  requestHead: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  requestStatus: { fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  requestBubble: {
    backgroundColor: colors.primarySofter,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    padding: 10,
  },
  requestMessage: { fontSize: 13, color: colors.text, fontStyle: "italic", lineHeight: 19 },
  requestActions: { flexDirection: "row", gap: 8 },
  waitingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  waitingText: { fontSize: 12.5, color: "#b45309", fontWeight: "700" },
});
