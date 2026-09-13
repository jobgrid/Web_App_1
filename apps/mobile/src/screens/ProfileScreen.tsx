import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Avatar } from "../components/Avatar";
import { GlassButton, GlassCard, Pill } from "../components/Glass";
import { toast } from "../components/Toast";
import { getCandidateProfileDetails, setAutoApply } from "../lib/data";
import { supabase, type Company, type Profile } from "../lib/supabase";
import { colors } from "../theme";

type CandidateDetails = NonNullable<Awaited<ReturnType<typeof getCandidateProfileDetails>>>;

export function ProfileScreen({
  profile,
  company,
}: {
  profile: Profile;
  company: Company | null;
}) {
  const [details, setDetails] = useState<CandidateDetails | null>(null);
  const isCandidate = profile.role === "candidate";

  const load = useCallback(async () => {
    if (isCandidate) setDetails(await getCandidateProfileDetails(profile.id));
  }, [isCandidate, profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleAutoApply(enabled: boolean) {
    setDetails((previous) => (previous ? { ...previous, auto_apply: enabled } : previous));
    await setAutoApply(profile.id, enabled);
    toast(enabled ? "Auto-apply is on — AI will apply for strong matches." : "Auto-apply is off.");
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profile</Text>

      <GlassCard style={styles.identityCard}>
        <Avatar name={profile.full_name} size={64} color={company?.brand_color} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <Pill
            label={isCandidate ? "Job seeker" : `Employer · ${company?.name ?? ""}`}
            fg={colors.primary}
            bg={colors.primarySoft}
          />
        </View>
      </GlassCard>

      {isCandidate && details && (
        <>
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About you</Text>
            <View style={styles.rowItem}>
              <Ionicons name="briefcase-outline" size={16} color={colors.muted} />
              <Text style={styles.rowText}>{details.headline || "Add a headline on the web"}</Text>
            </View>
            <View style={styles.rowItem}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={styles.rowText}>
                {details.location || "No location set"}
                {details.open_to_remote ? " · open to remote" : ""}
              </Text>
            </View>
            <View style={styles.rowItem}>
              <Ionicons name="document-attach-outline" size={16} color={colors.muted} />
              <Text style={styles.rowText}>
                {details.cv_filename ? `CV: ${details.cv_filename}` : "No CV uploaded yet"}
              </Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillRow}>
              {details.skills.length > 0 ? (
                details.skills.map((skill) => (
                  <Pill key={skill} label={skill} fg={colors.primary} bg={colors.primarySoft} />
                ))
              ) : (
                <Text style={styles.rowText}>Upload your CV and AI extracts these for you.</Text>
              )}
            </View>
          </GlassCard>

          <GlassCard style={styles.sectionCard}>
            <View style={styles.autoApplyRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.sectionTitle}>⚡ Auto-apply</Text>
                <Text style={styles.hint}>
                  AI applies for you when a new job matches at {details.auto_apply_min_score}%+.
                </Text>
              </View>
              <Switch
                value={details.auto_apply}
                onValueChange={toggleAutoApply}
                trackColor={{ true: colors.primary, false: "rgba(18,20,43,0.15)" }}
                thumbColor="#fff"
              />
            </View>
          </GlassCard>
        </>
      )}

      {!isCandidate && company && (
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Company</Text>
          <View style={styles.rowItem}>
            <Ionicons name="business-outline" size={16} color={colors.muted} />
            <Text style={styles.rowText}>{company.name}</Text>
          </View>
          {!!company.tagline && (
            <View style={styles.rowItem}>
              <Ionicons name="sparkles-outline" size={16} color={colors.muted} />
              <Text style={styles.rowText}>{company.tagline}</Text>
            </View>
          )}
          {!!company.location && (
            <View style={styles.rowItem}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={styles.rowText}>{company.location}</Text>
            </View>
          )}
          <Text style={styles.hint}>
            Manage billing, ad credits, API keys and ATS connections from the web dashboard.
          </Text>
        </GlassCard>
      )}

      <GlassButton
        label="Sign out"
        danger
        icon={<Ionicons name="log-out-outline" size={16} color={colors.danger} />}
        onPress={() => supabase.auth.signOut()}
      />
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 18, gap: 13 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text, letterSpacing: -0.6 },
  identityCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontSize: 18, fontWeight: "900", color: colors.text },
  email: { fontSize: 12.5, color: colors.muted, fontWeight: "600" },
  sectionCard: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  rowItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  rowText: { flex: 1, fontSize: 13.5, color: colors.text, fontWeight: "600", lineHeight: 19 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  autoApplyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
