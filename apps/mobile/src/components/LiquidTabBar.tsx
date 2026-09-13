import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radius, shadow } from "../theme";

export type TabItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

const BAR_PADDING = 8;

/**
 * Floating liquid-glass tab bar. A translucent pill morphs between tabs with
 * an overshooting spring + squish, echoing the iOS liquid tab bar.
 */
export function LiquidTabBar({
  items,
  activeKey,
  onChange,
  centerAction,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  centerAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
}) {
  const [barWidth, setBarWidth] = useState(0);
  const slotCount = items.length + (centerAction ? 1 : 0);
  const half = Math.ceil(items.length / 2);
  const slotWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / slotCount : 0;

  const slotForItem = (index: number) =>
    centerAction && index >= half ? index + 1 : index;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey)
  );
  const activeSlot = slotForItem(activeIndex);

  const position = useRef(new Animated.Value(activeSlot)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const iconPop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: activeSlot,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(squish, { toValue: 1.28, duration: 110, useNativeDriver: true }),
        Animated.spring(squish, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(iconPop, { toValue: 0.82, duration: 80, useNativeDriver: true }),
        Animated.spring(iconPop, { toValue: 1, friction: 3.5, tension: 160, useNativeDriver: true }),
      ]),
    ]).start();
  }, [activeSlot, position, squish, iconPop]);

  const pillTranslate = position.interpolate({
    inputRange: [0, Math.max(1, slotCount - 1)],
    outputRange: [0, Math.max(1, slotCount - 1) * slotWidth],
  });

  const renderTab = (item: TabItem, index: number) => {
    const active = item.key === activeKey;
    return (
      <Pressable
        key={item.key}
        style={[styles.slot, { width: slotWidth || undefined, flex: slotWidth ? undefined : 1 }]}
        onPress={() => onChange(item.key)}
      >
        <Animated.View
          style={[styles.slotContent, active && { transform: [{ scale: iconPop }] }]}
        >
          <View>
            <Ionicons
              name={active ? item.iconActive : item.icon}
              size={23}
              color={active ? colors.primary : colors.muted}
            />
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge > 9 ? "9+" : item.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.barOuter, shadow.floating]}>
        <BlurView
          intensity={40}
          tint="light"
          style={styles.bar}
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        >
          {slotWidth > 0 && (
            <Animated.View
              style={[
                styles.pill,
                {
                  width: slotWidth,
                  transform: [{ translateX: pillTranslate }, { scaleX: squish }, { scaleY: 1 }],
                },
              ]}
            />
          )}
          {items.slice(0, half).map((item, index) => renderTab(item, index))}
          {centerAction && (
            <View style={[styles.slot, { width: slotWidth || undefined }]}>
              <Pressable
                onPress={centerAction.onPress}
                style={({ pressed }) => [pressed && { transform: [{ scale: 0.92 }] }]}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.centerButton, shadow.floating]}
                >
                  <Ionicons name={centerAction.icon} size={26} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          )}
          {items.slice(half).map((item, index) => renderTab(item, half + index))}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 22,
  },
  barOuter: {
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingHorizontal: BAR_PADDING,
    paddingVertical: 9,
  },
  pill: {
    position: "absolute",
    left: BAR_PADDING,
    top: 7,
    bottom: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.18)",
  },
  slot: { alignItems: "center", justifyContent: "center" },
  slotContent: { alignItems: "center", gap: 3, paddingVertical: 3 },
  label: { fontSize: 10.5, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.primary, fontWeight: "800" },
  badge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -26,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
});
