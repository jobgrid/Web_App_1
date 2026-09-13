import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassButton, GlassCard, GradientButton, MatchRing, Pill } from "../components/Glass";
import { toast } from "../components/Toast";
import { applyToJob, getAppliedJobIds, getCandidateFeed, type FeedJob } from "../lib/data";
import { greeting, salaryLabel, timeAgo, workTypeLabel } from "../lib/format";
import { colors, radius, tierColors } from "../theme";

export function FeedScreen({
  userId,
  userName,
  onOpenJob,
}: {
  userId: string;
  userName: string;
  onOpenJob: (job: FeedJob, applied: boolean) => void;
}) {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [feed, appliedIds] = await Promise.all([getCandidateFeed(), getAppliedJobIds(userId)]);
    setJobs(feed);
    setApplied(appliedIds);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(job: FeedJob) {
    setApplyingId(job.id);
    const { error } = await applyToJob(job, userId, job.score);
    setApplyingId(null);
    if (error) {
      toast(error, "error");
    } else {
      setApplied((previous) => new Set([...previous, job.id]));
      toast(`Applied to ${job.title}`);
    }
  }

  const visible = query.trim()
    ? jobs.filter((job) =>
        `${job.title} ${job.companies?.name ?? ""} ${job.location} ${job.skills.join(" ")}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : jobs;

  return (
    <FlatList
      data={visible}
      keyExtractor={(job) => job.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{userName.split(" ")[0]} 👋</Text>
            </View>
            <Avatar name={userName} size={46} />
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={colors.faint} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search roles, companies, skills…"
              placeholderTextColor={colors.faint}
            />
          </View>
          <Text style={styles.sectionTitle}>Matched for you</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {refreshing ? "Finding your matches…" : "No live ads match right now — check back soon."}
        </Text>
      }
      renderItem={({ item: job }) => {
        const tier = tierColors[job.tier] ?? tierColors.basic!;
        const hasApplied = applied.has(job.id);
        const brand = job.companies?.brand_color ?? colors.primary;
        return (
          <GlassCard style={styles.jobCard} onPress={() => onOpenJob(job, hasApplied)}>
            {job.tier !== "basic" && (
              <View style={[styles.brandStripe, { backgroundColor: brand }]} />
            )}
            <View style={styles.jobTop}>
              <Avatar name={job.companies?.name ?? "?"} size={44} color={brand} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.jobTitle} numberOfLines={2}>
                  {job.title}
                </Text>
                <Text style={styles.jobCompany}>{job.companies?.name}</Text>
              </View>
              {job.score != null && <MatchRing score={job.score} />}
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{job.is_remote ? "Remote" : job.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>{workTypeLabel(job.work_type)}</Text>
              </View>
              {salaryLabel(job) && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={13} color={colors.muted} />
                  <Text style={styles.metaText}>{salaryLabel(job)}</Text>
                </View>
              )}
            </View>

            <View style={styles.pillRow}>
              <Pill label={tier.label} fg={tier.fg} bg={tier.bg} />
              {job.skills.slice(0, 3).map((skill) => (
                <Pill key={skill} label={skill} fg={colors.muted} bg="rgba(18,20,43,0.06)" />
              ))}
              {job.published_at && (
                <Text style={styles.timeText}>{timeAgo(job.published_at)}</Text>
              )}
            </View>

            <View style={styles.actionRow}>
              {hasApplied ? (
                <GlassButton
                  small
                  label="Applied ✓"
                  onPress={() => onOpenJob(job, true)}
                  style={{ flex: 1, backgroundColor: colors.successSoft, borderColor: "transparent" }}
                />
              ) : (
                <GradientButton
                  small
                  label={applyingId === job.id ? "Applying…" : "Apply now"}
                  onPress={() => apply(job)}
                  style={{ flex: 1 }}
                />
              )}
              <GlassButton
                small
                label="View & chat"
                icon={<Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.text} />}
                onPress={() => onOpenJob(job, hasApplied)}
                style={{ flex: 1 }}
              />
            </View>
          </GlassCard>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 130, gap: 14 },
  header: { gap: 14, marginBottom: 2 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 15, color: colors.muted, fontWeight: "600" },
  name: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -0.6 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 4 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 48, fontSize: 14 },
  jobCard: { gap: 12, overflow: "hidden" },
  brandStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  jobTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  jobTitle: { fontSize: 16.5, fontWeight: "800", color: colors.text, lineHeight: 21 },
  jobCompany: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12.5, color: colors.muted, fontWeight: "600" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  timeText: { fontSize: 11.5, color: colors.faint, fontWeight: "600", marginLeft: "auto" },
  actionRow: { flexDirection: "row", gap: 9 },
});
