import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase, type Conversation } from "../lib/supabase";
import { colors } from "../theme";

type PendingRequest = {
  id: string;
  status: string;
  message: string;
  jobs: { title: string } | null;
  companies: { name: string } | null;
};

export function ChatListScreen({
  userId,
  onOpen,
}: {
  userId: string;
  onOpen: (conversationId: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [{ data: conversationRows }, { data: requestRows }] = await Promise.all([
      supabase
        .from("conversations")
        .select(
          "id, candidate_id, last_message_at, jobs(title), companies(name), profiles!conversations_candidate_id_fkey(full_name)"
        )
        .order("last_message_at", { ascending: false }),
      supabase
        .from("chat_requests")
        .select("id, status, message, jobs(title), companies(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setConversations((conversationRows ?? []) as unknown as Conversation[]);
    setPending((requestRows ?? []) as unknown as PendingRequest[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    // Live-update the list when a conversation unlocks or a message lands.
    const channel = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <FlatList
      data={conversations}
      keyExtractor={(conversation) => conversation.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Text style={styles.title}>Chat</Text>
          {pending.map((request) => (
            <View key={request.id} style={styles.pendingCard}>
              <Text style={styles.pendingTitle}>
                Waiting on {request.companies?.name ?? "employer"}
              </Text>
              <Text style={styles.pendingMeta}>
                {request.jobs?.title ?? "General"} · unlocks when accepted
              </Text>
            </View>
          ))}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No conversations yet. Request a chat from any job to get started.
        </Text>
      }
      renderItem={({ item: conversation }) => {
        const mine = conversation.candidate_id === userId;
        const otherName = mine
          ? conversation.companies?.name ?? "Company"
          : conversation.profiles?.full_name ?? "Candidate";
        return (
          <TouchableOpacity style={styles.card} onPress={() => onOpen(conversation.id)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{otherName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{otherName}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {conversation.jobs?.title ?? "General chat"}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 14 },
  pendingCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
  },
  pendingTitle: { fontSize: 14, fontWeight: "700", color: colors.primary },
  pendingMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "800", fontSize: 16 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
});
