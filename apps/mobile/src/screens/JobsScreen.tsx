import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase, type Job } from "../lib/supabase";
import { colors } from "../theme";

function salaryLabel(job: Job): string | null {
  if (job.salary_min == null && job.salary_max == null) return null;
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  const range =
    job.salary_min != null && job.salary_max != null && job.salary_min !== job.salary_max
      ? `${fmt(job.salary_min)}–${fmt(job.salary_max)}`
      : fmt((job.salary_min ?? job.salary_max)!);
  return `${range}/${job.salary_period === "year" ? "yr" : job.salary_period === "day" ? "day" : "hr"}`;
}

export function JobsScreen({ userId }: { userId: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [{ data: matches }, { data: jobRows }, { data: applications }] = await Promise.all([
      supabase.rpc("matched_jobs_for_me"),
      supabase
        .from("jobs")
        .select("*, companies(name, brand_color)")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(50),
      supabase.from("applications").select("job_id").eq("candidate_id", userId),
    ]);
    const scoreMap: Record<string, number> = {};
    for (const match of (matches ?? []) as { job_id: string; score: number }[]) {
      scoreMap[match.job_id] = match.score;
    }
    setScores(scoreMap);
    const rows = (jobRows ?? []) as unknown as Job[];
    rows.sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0));
    setJobs(rows);
    setAppliedIds(new Set(((applications ?? []) as { job_id: string }[]).map((a) => a.job_id)));
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(job: Job) {
    const { error } = await supabase.from("applications").insert({
      job_id: job.id,
      candidate_id: userId,
      source: "manual",
      match_score: scores[job.id] ?? null,
    });
    if (error) {
      Alert.alert("Could not apply", error.code === "23505" ? "You already applied." : error.message);
    } else {
      setAppliedIds((previous) => new Set([...previous, job.id]));
      Alert.alert("Applied 🎉", `Your application for ${job.title} was submitted.`);
    }
  }

  async function requestChat(job: Job & { company_id?: string }) {
    const { data: fullJob } = await supabase
      .from("jobs")
      .select("company_id")
      .eq("id", job.id)
      .single();
    if (!fullJob) return;
    const { error } = await supabase.from("chat_requests").insert({
      job_id: job.id,
      candidate_id: userId,
      company_id: (fullJob as { company_id: string }).company_id,
      message: `Hi! I'm interested in ${job.title}.`,
    });
    if (error) {
      Alert.alert("Could not send", error.code === "23505" ? "Already requested." : error.message);
    } else {
      Alert.alert("Request sent", "The employer was notified by email. Chat unlocks when they accept.");
    }
  }

  return (
    <FlatList
      data={jobs}
      keyExtractor={(job) => job.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Matched jobs</Text>
          <Text style={styles.subtitle}>Ranked by AI match against your CV</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          No live jobs yet. Upload your CV at jobgrid.ai to unlock matches.
        </Text>
      }
      renderItem={({ item: job }) => {
        const score = scores[job.id];
        const applied = appliedIds.has(job.id);
        const expanded = expandedId === job.id;
        return (
          <TouchableOpacity
            style={[styles.card, job.tier === "premium" && styles.cardPremium]}
            onPress={() => setExpandedId(expanded ? null : job.id)}
            activeOpacity={0.8}
          >
            {job.tier !== "basic" && (
              <View
                style={[styles.brandBar, { backgroundColor: job.companies?.brand_color ?? colors.primary }]}
              />
            )}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.company}>{job.companies?.name}</Text>
              </View>
              {score != null && (
                <View style={[styles.scoreBadge, score >= 75 && styles.scoreBadgeHigh]}>
                  <Text style={[styles.scoreText, score >= 75 && styles.scoreTextHigh]}>
                    {score}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.meta}>
              {job.is_remote ? "Remote" : job.location}
              {salaryLabel(job) ? ` · ${salaryLabel(job)}` : ""}
            </Text>
            {expanded && (
              <View style={styles.expanded}>
                <Text style={styles.description} numberOfLines={8}>
                  {job.description}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, applied && styles.actionButtonDisabled]}
                    onPress={() => apply(job)}
                    disabled={applied}
                  >
                    <Text style={styles.actionText}>{applied ? "✓ Applied" : "Apply now"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonOutline]}
                    onPress={() => requestChat(job)}
                  >
                    <Text style={[styles.actionText, { color: colors.primary }]}>💬 Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: "hidden",
  },
  cardPremium: { borderColor: colors.primary },
  brandBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  jobTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  company: { fontSize: 13, color: colors.muted, marginTop: 1 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 6 },
  scoreBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  scoreBadgeHigh: { backgroundColor: colors.successSoft },
  scoreText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  scoreTextHigh: { color: colors.success },
  expanded: { marginTop: 10, gap: 10 },
  description: { fontSize: 13, color: colors.text, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonOutline: {
    backgroundColor: colors.primarySoft,
  },
  actionButtonDisabled: { backgroundColor: colors.success },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
