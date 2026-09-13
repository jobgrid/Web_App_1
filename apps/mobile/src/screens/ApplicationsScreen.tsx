import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassCard, Pill } from "../components/Glass";
import { getMyApplications } from "../lib/data";
import { timeAgo } from "../lib/format";
import type { Application } from "../lib/supabase";
import { colors, statusColors } from "../theme";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Applied by you",
  batch: "Batch apply",
  auto: "Auto-applied by AI",
};

export function ApplicationsScreen({ userId }: { userId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setApplications(await getMyApplications(userId));
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      data={applications}
      keyExtractor={(application) => application.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Applications</Text>
          <Text style={styles.subtitle}>
            {applications.length} application{applications.length === 1 ? "" : "s"} · keep an eye on
            status updates here
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {refreshing ? "Loading…" : "Nothing yet — apply to a matched job from your feed."}
        </Text>
      }
      renderItem={({ item: application }) => {
        const status = statusColors[application.status] ?? statusColors.submitted!;
        const company = application.jobs?.companies;
        return (
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <Avatar name={company?.name ?? "?"} size={44} color={company?.brand_color} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {application.jobs?.title ?? "Job"}
                </Text>
                <Text style={styles.companyName}>{company?.name}</Text>
              </View>
              <Pill label={status.label} fg={status.fg} bg={status.bg} />
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons
                  name={application.source === "auto" ? "flash" : "paper-plane-outline"}
                  size={12.5}
                  color={application.source === "auto" ? colors.violet : colors.muted}
                />
                <Text
                  style={[styles.metaText, application.source === "auto" && { color: colors.violet }]}
                >
                  {SOURCE_LABELS[application.source] ?? application.source}
                </Text>
              </View>
              {application.match_score != null && (
                <Text style={styles.metaText}>{application.match_score}% match</Text>
              )}
              <Text style={[styles.metaText, { marginLeft: "auto" }]}>
                {timeAgo(application.created_at)}
              </Text>
            </View>
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
  jobTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  companyName: { fontSize: 12.5, color: colors.muted, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
});
