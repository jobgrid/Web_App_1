import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";

import { initials } from "../lib/format";

const PALETTES: [string, string][] = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#22d3ee"],
  ["#f97316", "#fb923c"],
  ["#10b981", "#34d399"],
  ["#ec4899", "#f472b6"],
  ["#8b5cf6", "#c084fc"],
];

function paletteFor(name: string): [string, string] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length]!;
}

export function Avatar({
  name,
  size = 46,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const gradient: [string, string] = color ? [color, color] : paletteFor(name);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontWeight: "800" },
});
