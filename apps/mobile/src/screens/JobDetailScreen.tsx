import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassCard, GradientButton, MatchRing, Pill } from "../components/Glass";
import { toast } from "../components/Toast";
import { applyToJob, requestChat, type FeedJob } from "../lib/data";
import { salaryLabel, timeAgo, workTypeLabel } from "../lib/format";
import { supabase } from "../lib/supabase";
import { colors, radius, tierColors } from "../theme";

export function JobDetailScreen({
  job,
  userId,
  initiallyApplied,
  onBack,
}: {
  job: FeedJob;
  userId: string;
  initiallyApplied: boolean;
  onBack: () => void;
}) {
  const [applied, setApplied] = useState(initiallyApplied);
  const [chatState, setChatState] = useState<"none" | "pending" | "accepted">("none");
  const [message, setMessage] = useState(
    `Hi! I'd love to chat about the ${job.title} role — I think I'd be a great fit.`
  );
  const [busy, setBusy] = useState<"apply" | "chat" | null>(null);
  const brand = job.companies?.brand_color ?? colors.primary;
  const tier = tierColors[job.tier] ?? tierColors.basic!;

  useEffect(() => {
    void supabase
      .from("job_events")
      .insert({ job_id: job.id, event_type: "view", actor_id: userId })
      .then(() => undefined);
    supabase
      .from("chat_requests")
      .select("status")
      .eq("job_id", job.id)
      .eq("candidate_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const status = (data as { status: string } | null)?.status;
        if (status === "pending") setChatState("pending");
        if (status === "accepted") setChatState("accepted");
      });
  }, [job.id, userId]);

  async function apply() {
    setBusy("apply");
    const { error } = await applyToJob(job, userId, job.score);
    setBusy(null);
    if (error) toast(error, "error");
    else {
      setApplied(true);
      toast(`Applied to ${job.title}`);
    }
  }

  async function sendChatRequest() {
    setBusy("chat");
    const { error } = await requestChat(job, userId, message.trim());
    setBusy(null);
    if (error) toast(error, "error");
    else {
      setChatState("pending");
      toast("Chat request sent — you'll be notified when it's accepted.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <BlurView intensity={45} tint="light" style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {job.companies?.name}
        </Text>
        <View style={{ width: 38 }} />
      </BlurView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Avatar name={job.companies?.name ?? "?"} size={54} color={brand} />
            {job.score != null && <MatchRing score={job.score} />}
          </View>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.companies?.name}</Text>
          <View style={styles.metaRow}>
            <Pill label={tier.label} fg={tier.fg} bg={tier.bg} />
            <Pill
              label={job.is_remote ? "Remote" : job.location}
              fg={colors.muted}
              bg="rgba(18,20,43,0.06)"
            />
            <Pill label={workTypeLabel(job.work_type)} fg={colors.muted} bg="rgba(18,20,43,0.06)" />
            {salaryLabel(job) && (
              <Pill label={salaryLabel(job)!} fg="#047857" bg={colors.successSoft} />
            )}
          </View>
          {job.published_at && (
            <Text style={styles.posted}>Posted {timeAgo(job.published_at)} ago</Text>
          )}
        </GlassCard>

        {job.highlights.length > 0 && (
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>Why you'll love it</Text>
            {job.highlights.map((highlight) => (
              <View key={highlight} style={styles.highlightRow}>
                <Ionicons name="sparkles" size={14} color={colors.violet} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>About the role</Text>
          <Text style={styles.description}>{job.description}</Text>
          {job.skills.length > 0 && (
            <View style={styles.skillRow}>
              {job.skills.map((skill) => (
                <Pill key={skill} label={skill} fg={colors.primary} bg={colors.primarySoft} />
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionTitle}>
            {chatState === "accepted"
              ? "Chat unlocked 🎉"
              : chatState === "pending"
                ? "Chat request sent"
                : `Say hi to ${job.companies?.name}`}
          </Text>
          {chatState === "none" ? (
            <>
              <Text style={styles.chatHint}>
                Skip the cover letter — start a conversation with the hiring team, Boss-style.
              </Text>
              <TextInput
                style={styles.chatInput}
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder="Write a short intro…"
                placeholderTextColor={colors.faint}
              />
            </>
          ) : (
            <Text style={styles.chatHint}>
              {chatState === "accepted"
                ? "Head to your Chats tab to continue the conversation."
                : "The employer has been notified. The chat unlocks as soon as they accept."}
            </Text>
          )}
        </GlassCard>
        <View style={{ height: 140 }} />
      </ScrollView>

      <BlurView intensity={45} tint="light" style={styles.footer}>
        {applied ? (
          <View style={[styles.appliedBadge]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.appliedText}>Applied</Text>
          </View>
        ) : (
          <GradientButton
            label={busy === "apply" ? "Applying…" : "Apply now"}
            onPress={apply}
            loading={busy === "apply"}
            style={{ flex: 1 }}
          />
        )}
        {chatState === "none" && (
          <GradientButton
            label={busy === "chat" ? "Sending…" : "Request chat"}
            onPress={sendChatRequest}
            loading={busy === "chat"}
            colors={["#0ea5e9", "#22d3ee"]}
            icon={<Ionicons name="chatbubble-ellipses" size={16} color="#fff" />}
            style={{ flex: 1 }}
          />
        )}
        {chatState === "pending" && (
          <View style={styles.pendingBadge}>
            <Ionicons name="hourglass-outline" size={16} color={colors.amber} />
            <Text style={styles.pendingText}>Awaiting accept</Text>
          </View>
        )}
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 15.5, fontWeight: "800", color: colors.text },
  scroll: { padding: 18, gap: 14 },
  heroCard: { gap: 8 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 21, fontWeight: "900", color: colors.text, letterSpacing: -0.4, lineHeight: 27 },
  company: { fontSize: 14, fontWeight: "700", color: colors.muted },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  posted: { fontSize: 12, color: colors.faint, fontWeight: "600", marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15.5, fontWeight: "800", color: colors.text },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  highlightText: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: "600" },
  description: { fontSize: 14, color: colors.muted, lineHeight: 21 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chatHint: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  chatInput: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: "top",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 26,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  appliedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  appliedText: { fontSize: 14.5, fontWeight: "800", color: "#047857" },
  pendingBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingVertical: 14,
  },
  pendingText: { fontSize: 14, fontWeight: "800", color: "#b45309" },
});
