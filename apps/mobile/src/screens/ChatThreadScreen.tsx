import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "../components/Avatar";
import { getMessages, sendMessage } from "../lib/data";
import { clockTime } from "../lib/format";
import { supabase, type Conversation, type Message } from "../lib/supabase";
import { colors, gradients, radius } from "../theme";

type Row =
  | { type: "message"; message: Message }
  | { type: "day"; id: string; label: string };

function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  for (const message of messages) {
    const day = new Date(message.created_at).toDateString();
    if (day !== lastDay) {
      lastDay = day;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86_400_000).toDateString();
      rows.push({
        type: "day",
        id: `day-${day}`,
        label:
          day === today
            ? "Today"
            : day === yesterday
              ? "Yesterday"
              : new Date(message.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                }),
      });
    }
    rows.push({ type: "message", message });
  }
  return rows;
}

export function ChatThreadScreen({
  conversation,
  userId,
  onBack,
}: {
  conversation: Conversation;
  userId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<Row>>(null);

  const isCandidate = conversation.candidate_id === userId;
  const otherName = isCandidate
    ? conversation.companies?.name ?? "Company"
    : conversation.profiles?.full_name ?? "Candidate";

  const appendMessage = useCallback((message: Message) => {
    setMessages((previous) =>
      previous.some((item) => item.id === message.id) ? previous : [...previous, message]
    );
  }, []);

  useEffect(() => {
    getMessages(conversation.id).then(setMessages);
    const channel = supabase
      .channel(`thread:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => appendMessage(payload.new as Message)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, appendMessage]);

  async function send() {
    const body = input.trim();
    if (!body) return;
    setInput("");
    const message = await sendMessage(conversation.id, userId, body);
    if (message) appendMessage(message);
  }

  const rows = buildRows(messages);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BlurView intensity={45} tint="light" style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Avatar
          name={otherName}
          size={40}
          color={isCandidate ? conversation.companies?.brand_color : undefined}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={styles.headerJob} numberOfLines={1}>
            {conversation.jobs?.title ?? "General chat"}
          </Text>
        </View>
      </BlurView>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => (row.type === "day" ? row.id : row.message.id)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.unlockedCard}>
            <Ionicons name="lock-open-outline" size={18} color={colors.success} />
            <Text style={styles.unlockedText}>
              Chat unlocked — introduce yourself to {otherName}.
            </Text>
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.type === "day") {
            return (
              <View style={styles.dayRow}>
                <Text style={styles.dayText}>{row.label}</Text>
              </View>
            );
          }
          const message = row.message;
          const mine = message.sender_id === userId;
          const content =
            message.kind === "voice" ? "🎙 Voice note (listen on web)" : message.body;
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              {mine ? (
                <LinearGradient
                  colors={gradients.bubble}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.bubbleMine]}
                >
                  <Text style={styles.bubbleTextMine}>{content}</Text>
                  <Text style={styles.bubbleTimeMine}>{clockTime(message.created_at)}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{content}</Text>
                  <Text style={styles.bubbleTime}>{clockTime(message.created_at)}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      <BlurView intensity={45} tint="light" style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message…"
          placeholderTextColor={colors.faint}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable onPress={send} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButton}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  headerName: { fontSize: 15.5, fontWeight: "800", color: colors.text },
  headerJob: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  list: { padding: 16, gap: 7, paddingBottom: 20 },
  unlockedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 16,
  },
  unlockedText: { fontSize: 13, color: "#047857", fontWeight: "700", flexShrink: 1 },
  dayRow: { alignItems: "center", marginVertical: 8 },
  dayText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: "hidden",
  },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 2,
  },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: 14.5, color: colors.text, lineHeight: 20 },
  bubbleTextMine: { fontSize: 14.5, color: "#fff", lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.faint, alignSelf: "flex-end" },
  bubbleTimeMine: { fontSize: 10, color: "rgba(255,255,255,0.75)", alignSelf: "flex-end" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    paddingBottom: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.text,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
