import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "./theme";

export function Glass({
  children,
  style,
  radius = 28,
  intensity = 48,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
}) {
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" tintColor="rgba(255,252,247,0.28)" colorScheme="light" style={[{ borderRadius: radius }, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallback, { borderRadius: radius }, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    overflow: "hidden",
    backgroundColor: theme.glass,
    borderWidth: 1,
    borderColor: theme.stroke,
  },
});
