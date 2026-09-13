import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { colors, radius, shadow } from "../theme";

type ToastPayload = { text: string; kind: "success" | "error" };

let pushToast: ((payload: ToastPayload) => void) | null = null;

export function toast(text: string, kind: "success" | "error" = "success") {
  pushToast?.({ text, kind });
}

/** Single floating glass toast. Mount once at app root. */
export function ToastHost() {
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pushToast = (next) => {
      setPayload(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.spring(opacity, { toValue: 1, friction: 7, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(
          () => setPayload(null)
        );
      }, 2600);
    };
    return () => {
      pushToast = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  if (!payload) return null;
  const success = payload.kind === "success";
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        shadow.floating,
        {
          opacity,
          transform: [
            { translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        },
      ]}
    >
      <Ionicons
        name={success ? "checkmark-circle" : "alert-circle"}
        size={19}
        color={success ? colors.success : colors.danger}
      />
      <Text style={styles.text}>{payload.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 54,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 100,
  },
  text: { flex: 1, fontSize: 13.5, fontWeight: "600", color: colors.text },
});
