import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassCard, GradientButton, Pill } from "../components/Glass";
import {
  getCompanyJobs,
  getCompanyStats,
  type EmployerJob,
  type EmployerStats,
} from "../lib/data";
import { greeting, timeAgo } from "../lib/format";
import type { Company } from "../lib/supabase";
import { colors, tierColors } from "../theme";

const JOB_STATUS: Record<string, { fg: string; bg: string; label: string }> = {
  active: { fg: "#047857", bg: colors.successSoft, label: "Live" },
  draft: { fg: colors.muted, bg: "rgba(18,20,43,0.07)", label: "Draft" },
  expired: { fg: "#b45309", bg: colors.amberSoft, label: "Expired" },
  closed: { fg: colors.faint, bg: "rgba(18,20,43,0.05)", label: "Closed" },
};

export function EmployerHomeScreen({
  company,
  userName,
  onPostAd,
  reloadKey,
}: {
  company: Company;
  userName: string;
  onPostAd: () => void;
  reloadKey: number;
}) {
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [stats, setStats] = useState<EmployerStats>({ views: 0, applies: 0, chats: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [jobRows, statTotals] = await Promise.all([
      getCompanyJobs(company.id),
      getCompanyStats(company.id),
    ]);
    setJobs(jobRows);
    setStats(statTotals);
    setRefreshing(false);
  }, [company.id]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const liveCount = jobs.filter((job) => job.status === "active").length;

  return (
    <FlatList
      data={jobs}
      keyExtractor={(job) => job.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{userName.split(" ")[0]} 👋</Text>
              <Text style={styles.companyLine}>
                {company.name} · {liveCount} live ad{liveCount === 1 ? "" : "s"}
              </Text>
            </View>
            <Avatar name={company.name} size={48} color={company.brand_color} />
          </View>

          <View style={styles.statsRow}>
            {(
              [
                { label: "Views", value: stats.views, icon: "eye-outline" },
                { label: "Applies", value: stats.applies, icon: "document-text-outline" },
                { label: "Chats", value: stats.chats, icon: "chatbubbles-outline" },
              ] as const
            ).map((stat) => (
              <GlassCard key={stat.label} style={styles.statCard}>
                <Ionicons name={stat.icon} size={17} color={colors.primary} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </GlassCard>
            ))}
          </View>

          <GradientButton
            label="Post a new ad — right from chat"
            icon={<Ionicons name="add-circle" size={18} color="#fff" />}
            onPress={onPostAd}
          />

          <Text style={styles.sectionTitle}>Your ads</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {refreshing ? "Loading…" : "No ads yet — tap the button above to post your first one."}
        </Text>
      }
      renderItem={({ item: job }) => {
        const tier = tierColors[job.tier] ?? tierColors.basic!;
        const status = JOB_STATUS[job.status] ?? JOB_STATUS.draft!;
        return (
          <GlassCard style={styles.jobCard}>
            <View style={styles.jobTopRow}>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
              <Pill label={status.label} fg={status.fg} bg={status.bg} />
            </View>
            <View style={styles.jobMetaRow}>
              <Pill label={tier.label} fg={tier.fg} bg={tier.bg} />
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={colors.muted} />
                <Text style={styles.metaText}>
                  {job.applicant_count} applicant{job.applicant_count === 1 ? "" : "s"}
                </Text>
              </View>
              {job.expires_at && job.status === "active" && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={colors.muted} />
                  <Text style={styles.metaText}>
                    expires {new Date(job.expires_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
              )}
              {job.published_at && (
                <Text style={[styles.metaText, { marginLeft: "auto", color: colors.faint }]}>
                  {timeAgo(job.published_at)}
                </Text>
              )}
            </View>
          </GlassCard>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 130, gap: 11 },
  header: { gap: 14, marginBottom: 4 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 15, color: colors.muted, fontWeight: "600" },
  name: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -0.6 },
  companyLine: { fontSize: 12.5, color: colors.primary, fontWeight: "700", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 14 },
  statValue: { fontSize: 21, fontWeight: "900", color: colors.text },
  statLabel: { fontSize: 11.5, fontWeight: "700", color: colors.muted },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  empty: { textAlign: "center", color: colors.muted, marginTop: 30, fontSize: 14 },
  jobCard: { gap: 9 },
  jobTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  jobTitle: { flex: 1, fontSize: 15.5, fontWeight: "800", color: colors.text },
  jobMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
});
