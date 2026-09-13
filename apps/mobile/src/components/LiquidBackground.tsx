import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { colors, gradients } from "../theme";

function Blob({
  color,
  size,
  top,
  left,
  drift = 26,
  duration = 9000,
}: {
  color: string;
  size: number;
  top: number;
  left: number;
  drift?: number;
  duration?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -drift / 2] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
        ],
      }}
    />
  );
}

/** Soft aurora gradient + slowly drifting colour blobs behind a heavy blur. */
export function LiquidBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.aurora} style={StyleSheet.absoluteFill} />
      <Blob color={colors.blobIndigo} size={300} top={-70} left={-60} duration={10000} />
      <Blob color={colors.blobCyan} size={230} top={110} left={220} duration={12000} drift={34} />
      <Blob color={colors.blobViolet} size={280} top={430} left={-90} duration={11000} drift={30} />
      <Blob color={colors.blobPink} size={220} top={620} left={210} duration={13000} />
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
});
