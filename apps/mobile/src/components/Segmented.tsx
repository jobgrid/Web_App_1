import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme";

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; badge?: number }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.key === value));
  const position = useRef(new Animated.Value(index)).current;
  const segmentWidth = width > 0 ? (width - 8) / options.length : 0;

  useEffect(() => {
    Animated.spring(position, {
      toValue: index,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [index, position]);

  return (
    <View style={styles.track} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: [0, Math.max(1, options.length - 1)],
                    outputRange: [0, Math.max(1, options.length - 1) * segmentWidth],
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable key={option.key} style={styles.segment} onPress={() => onChange(option.key)}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
            {option.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{option.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "rgba(18,20,43,0.06)",
    borderRadius: radius.pill,
    padding: 4,
  },
  thumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    shadowColor: "#312e81",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  label: { fontSize: 13.5, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.text, fontWeight: "800" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
