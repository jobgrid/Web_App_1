import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassButton, GlassCard, Pill } from "../components/Glass";
import { toast } from "../components/Toast";
import { getCompanyApplicants, updateApplicationStatus } from "../lib/data";
import { timeAgo } from "../lib/format";
import type { Application, Company } from "../lib/supabase";
import { colors, statusColors } from "../theme";

export function ApplicantsScreen({ company }: { company: Company }) {
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setApplicants(await getCompanyApplicants(company.id));
    setRefreshing(false);
  }, [company.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(application: Application, status: "shortlisted" | "rejected") {
    await updateApplicationStatus(application.id, status);
    toast(
      status === "shortlisted"
        ? `${application.profiles?.full_name ?? "Candidate"} shortlisted`
        : "Marked as not selected"
    );
    load();
  }

  return (
    <FlatList
      data={applicants}
      keyExtractor={(application) => application.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Applicants</Text>
          <Text style={styles.subtitle}>
            {applicants.length} candidate{applicants.length === 1 ? "" : "s"} across your live ads
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {refreshing ? "Loading…" : "No applicants yet — they'll land here as soon as they apply."}
        </Text>
      }
      renderItem={({ item: application }) => {
        const status = statusColors[application.status] ?? statusColors.submitted!;
        const name = application.profiles?.full_name ?? "Candidate";
        const undecided =
          application.status === "submitted" || application.status === "viewed";
        return (
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <Avatar name={name} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {application.jobs?.title}
                </Text>
              </View>
              {application.match_score != null && (
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreValue}>{application.match_score}%</Text>
                  <Text style={styles.scoreLabel}>match</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Pill label={status.label} fg={status.fg} bg={status.bg} />
              {application.source === "auto" && (
                <Pill label="AI auto-apply" fg={colors.violet} bg="rgba(139,92,246,0.12)" />
              )}
              <Text style={[styles.metaText, { marginLeft: "auto" }]}>
                {timeAgo(application.created_at)}
              </Text>
            </View>
            {undecided && (
              <View style={styles.actions}>
                <GlassButton
                  small
                  label="Shortlist"
                  active
                  icon={<Ionicons name="star" size={14} color="#fff" />}
                  onPress={() => setStatus(application, "shortlisted")}
                  style={{ flex: 1 }}
                />
                <GlassButton
                  small
                  label="Pass"
                  danger
                  onPress={() => setStatus(application, "rejected")}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </GlassCard>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 18, paddingBottom: 130, gap: 12 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 48, fontSize: 14 },
  card: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 15.5, fontWeight: "800", color: colors.text },
  jobTitle: { fontSize: 12.5, color: colors.primary, fontWeight: "700" },
  scoreBox: { alignItems: "center" },
  scoreValue: { fontSize: 16, fontWeight: "900", color: colors.success },
  scoreLabel: { fontSize: 9.5, fontWeight: "700", color: colors.success, textTransform: "uppercase" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 12, color: colors.faint, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
});
