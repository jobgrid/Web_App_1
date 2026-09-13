import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, gradients, radius, shadow } from "../theme";

export function GlassCard({
  children,
  style,
  onPress,
  intensity = 28,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  intensity?: number;
}) {
  const body = (
    <BlurView intensity={intensity} tint="light" style={[styles.cardInner, style]}>
      {children}
    </BlurView>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardOuter, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={styles.cardOuter}>{body}</View>;
}

export function GradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  colors: gradientColors = gradients.primary,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { opacity: disabled ? 0.5 : 1 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientButton, small && styles.gradientButtonSmall, shadow.card]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.gradientButtonText, small && { fontSize: 13 }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function GlassButton({
  label,
  onPress,
  icon,
  active,
  danger,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassButton,
        small && styles.glassButtonSmall,
        active && styles.glassButtonActive,
        danger && styles.glassButtonDanger,
        pressed && { transform: [{ scale: 0.96 }] },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.glassButtonText,
          small && { fontSize: 13 },
          active && { color: "#fff" },
          danger && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({
  label,
  fg,
  bg,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function MatchRing({ score }: { score: number }) {
  const tone =
    score >= 70 ? colors.success : score >= 40 ? colors.amber : colors.faint;
  const bg =
    score >= 70 ? colors.successSoft : score >= 40 ? colors.amberSoft : "rgba(154,160,184,0.14)";
  return (
    <View style={[styles.matchRing, { borderColor: tone, backgroundColor: bg }]}>
      <Text style={[styles.matchScore, { color: tone }]}>{score}</Text>
      <Text style={[styles.matchLabel, { color: tone }]}>match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  cardInner: {
    backgroundColor: colors.glass,
    padding: 16,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  gradientButtonSmall: { paddingVertical: 9, paddingHorizontal: 16 },
  gradientButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glassButtonSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  glassButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  glassButtonDanger: { backgroundColor: colors.dangerSoft, borderColor: "rgba(239,68,68,0.25)" },
  glassButtonText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 11, fontWeight: "700" },
  matchRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  matchScore: { fontSize: 15, fontWeight: "800", lineHeight: 17 },
  matchLabel: { fontSize: 8, fontWeight: "700", textTransform: "uppercase" },
});
