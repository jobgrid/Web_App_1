import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { colors } from "../theme";

type CandidateProfile = {
  headline: string;
  location: string;
  skills: string[];
  cv_filename: string | null;
  auto_apply: boolean;
  auto_apply_min_score: number;
};

export function ProfileScreen({ userId }: { userId: string }) {
  const [fullName, setFullName] = useState("");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single()
      .then(({ data }) => setFullName((data as { full_name: string } | null)?.full_name ?? ""));
    supabase
      .from("candidate_profiles")
      .select("headline, location, skills, cv_filename, auto_apply, auto_apply_min_score")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data as CandidateProfile | null));
  }, [userId]);

  async function toggleAutoApply(value: boolean) {
    setProfile((previous) => (previous ? { ...previous, auto_apply: value } : previous));
    await supabase.from("candidate_profiles").update({ auto_apply: value }).eq("user_id", userId);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{fullName}</Text>
        {profile?.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
        {profile?.location ? <Text style={styles.meta}>{profile.location}</Text> : null}
        <Text style={styles.meta}>
          CV: {profile?.cv_filename ?? "not uploaded — add it at jobgrid.ai"}
        </Text>
      </View>

      {profile && (
        <>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Auto-apply</Text>
                <Text style={styles.meta}>
                  Apply automatically at ≥{profile.auto_apply_min_score}% match
                </Text>
              </View>
              <Switch
                value={profile.auto_apply}
                onValueChange={toggleAutoApply}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>

          {profile.skills.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <View style={styles.skills}>
                {profile.skills.map((skill) => (
                  <View key={skill} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  headline: { fontSize: 14, color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  skills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  skillBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skillText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  signOut: { alignItems: "center", paddingVertical: 14 },
  signOutText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
});
