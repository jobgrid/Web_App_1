import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Glass } from "../ui/Glass";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

export default function RoleScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 36, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, justifyContent: "space-between" }}>
      <View style={{ gap: 10 }}>
        <AppText size={14} weight="600" color={theme.faint}>
          JobGrid
        </AppText>
        <AppText size={40} weight="600" style={{ lineHeight: 46 }}>
          How should JobGrid help?
        </AppText>
        <AppText size={18} color={theme.soft}>
          Hiring, or ready for what would make you move.
        </AppText>
      </View>
      <View style={{ gap: 12 }}>
        <PressableScale label="I'm hiring" onPress={() => router.push("/sign-in")}>
          <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 72, justifyContent: "center", paddingHorizontal: 20, gap: 2 }}>
            <AppText size={18} weight="600" color={theme.white}>
              I’m hiring
            </AppText>
            <AppText size={14} color="rgba(255,252,250,0.72)">
              Tell JobGrid who you need.
            </AppText>
          </View>
        </PressableScale>
        <PressableScale label="I'm looking" onPress={() => router.push("/seeker-sign-in")}>
          <Glass radius={28} style={{ minHeight: 72, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 2 }}>
            <AppText size={18} weight="600">
              I’m looking
            </AppText>
            <AppText size={14} color={theme.soft}>
              Tell JobGrid what would make you move.
            </AppText>
          </Glass>
        </PressableScale>
      </View>
    </View>
  );
}
