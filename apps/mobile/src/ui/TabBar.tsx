import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { Glass } from "./Glass";
import { Icon } from "./Icon";
import { AppText } from "./Text";
import { theme } from "./theme";

const ICONS = {
  index: "home",
  missions: "missions",
  inbox: "inbox",
  you: "you",
} as const;

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: app } = useStore();
  const openInbox = app.inbox.filter((item) => !item.resolution).length;
  const [layouts, setLayouts] = useState<{ x: number; width: number }[]>([]);
  const x = useSharedValue(0);
  const width = useSharedValue(72);
  const current = layouts[state.index];

  useEffect(() => {
    if (!current) return;
    x.value = withSpring(current.x, { damping: 17, stiffness: 190, mass: 0.7 });
    width.value = withSpring(current.width, { damping: 17, stiffness: 190, mass: 0.7 });
  }, [current, width, x]);

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: width.value,
  }));

  return (
    <View style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 12) }}>
      <Glass radius={32} style={{ height: 68 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 8,
                height: 52,
                borderRadius: 26,
                backgroundColor: "rgba(26,25,22,0.08)",
              },
              pill,
            ]}
          />
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key]?.options.title ?? route.name;
            const icon = ICONS[route.name as keyof typeof ICONS] ?? "home";
            return (
              <View
                key={route.key}
                style={{ flex: 1 }}
                onLayout={(event) => {
                  const next = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width };
                  setLayouts((prev) => {
                    const copy = [...prev];
                    if (copy[index]?.x === next.x && copy[index]?.width === next.width) return prev;
                    copy[index] = next;
                    return copy;
                  });
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: focused }}
                  onPress={() => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={{ alignItems: "center", justifyContent: "center", height: 68, gap: 2 }}
                >
                  <View>
                    <Icon name={icon} size={20} color={focused ? theme.ink : theme.faint} />
                    {route.name === "inbox" && openInbox > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          top: -2,
                          right: -6,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.good,
                        }}
                      />
                    ) : null}
                  </View>
                  <AppText size={11} weight={focused ? "600" : "500"} color={focused ? theme.ink : theme.faint} style={{ lineHeight: 14 }}>
                    {label}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}
