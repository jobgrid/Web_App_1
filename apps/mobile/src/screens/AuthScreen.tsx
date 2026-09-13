import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GlassCard, GradientButton } from "../components/Glass";
import { supabase } from "../lib/supabase";
import { colors, gradients, radius } from "../theme";

const DEMO_ACCOUNTS = [
  { label: "Job seeker · Alex", email: "delivered+candidate@resend.dev", icon: "person" as const },
  { label: "Employer · Nimbus AI", email: "delivered@resend.dev", icon: "business" as const },
];

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(withEmail?: string, withPassword?: string) {
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: withEmail ?? email.trim(),
      password: withPassword ?? password,
    });
    if (signInError) setError(signInError.message);
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brand}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logo}
        >
          <Ionicons name="grid" size={30} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>JobGrid</Text>
        <Text style={styles.subtitle}>Chat your way to your next role</Text>
      </View>

      <GlassCard style={styles.card}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.faint}
          secureTextEntry
          onSubmitEditing={() => signIn()}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <GradientButton label="Sign in" onPress={() => signIn()} loading={busy} />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>demo accounts</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.demoRow}>
          {DEMO_ACCOUNTS.map((account) => (
            <Pressable
              key={account.email}
              style={({ pressed }) => [styles.demoChip, pressed && { opacity: 0.7 }]}
              onPress={() => signIn(account.email, "JobGridDemo1!")}
            >
              <Ionicons name={account.icon} size={15} color={colors.primary} />
              <Text style={styles.demoText}>{account.label}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 24, gap: 28 },
  brand: { alignItems: "center", gap: 10 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 30, fontWeight: "900", color: colors.text, letterSpacing: -0.8 },
  subtitle: { fontSize: 14.5, color: colors.muted, fontWeight: "500" },
  card: { gap: 8, padding: 20 },
  fieldLabel: { fontSize: 12.5, fontWeight: "700", color: colors.muted, marginTop: 4 },
  input: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 6,
  },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, fontWeight: "700", color: colors.faint, textTransform: "uppercase" },
  demoRow: { flexDirection: "row", gap: 8 },
  demoChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  demoText: { fontSize: 12, fontWeight: "700", color: colors.primary },
});
