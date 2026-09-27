import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { theme } from "./theme";

export function Frame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const framed = width > 520;
  return (
    <View style={{ flex: 1, backgroundColor: framed ? theme.frame : theme.canvasMid, alignItems: "center" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: 440, overflow: "hidden" }}>
        <LinearGradient
          colors={[theme.canvasTop, theme.canvasMid, theme.canvasBottom]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.orb, { backgroundColor: theme.orb, top: -80, right: -70 }]} />
        <View style={[styles.orb, { backgroundColor: theme.orbWarm, width: 240, height: 240, bottom: 40, left: -90 }]} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
  },
});
