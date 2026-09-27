import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { Glass } from "../ui/Glass";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

const PAGES = [
  {
    title: "Tell JobGrid.",
    body: "Hiring someone, or ready to move. You describe the outcome. JobGrid does the searching.",
  },
  {
    title: "A mission, not a job ad.",
    body: "JobGrid does the hiring work, and only interrupts you when someone is worth meeting.",
  },
  {
    title: "You decide.",
    body: "Meet, ask a question, or pass. JobGrid recommends. You choose.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useStore();
  const [page, setPage] = useState(0);
  const current = PAGES[page];

  const finish = () => {
    completeOnboarding();
    router.replace("/role");
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, justifyContent: "space-between" }}>
      <PressableScale label="Skip" onPress={finish} style={{ alignSelf: "flex-end" }}>
        <AppText size={16} color={theme.soft}>
          Skip
        </AppText>
      </PressableScale>
      <View style={{ gap: 18 }}>
        <AppText size={40} weight="600">
          {current.title}
        </AppText>
        <AppText size={18} color={theme.soft}>
          {current.body}
        </AppText>
        {page === 1 ? (
          <Glass radius={24} style={{ padding: 18, gap: 6 }}>
            <AppText size={13} weight="600" color={theme.faint}>
              Working
            </AppText>
            <AppText size={20} weight="600">
              Hire Dental Receptionist
            </AppText>
            <AppText size={15} color={theme.soft}>
              Parramatta · JobGrid is looking.
            </AppText>
          </Glass>
        ) : null}
      </View>
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {PAGES.map((item, index) => (
            <PressableScale key={item.title} label={`Page ${index + 1}`} onPress={() => setPage(index)}>
              <View
                style={{
                  width: index === page ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === page ? theme.ink : "rgba(26,25,22,0.2)",
                }}
              />
            </PressableScale>
          ))}
        </View>
        <PressableScale label={page === PAGES.length - 1 ? "Continue" : "Next"} onPress={() => (page === PAGES.length - 1 ? finish() : setPage(page + 1))}>
          <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 56, alignItems: "center", justifyContent: "center" }}>
            <AppText size={17} weight="600" color={theme.white}>
              {page === PAGES.length - 1 ? "Continue" : "Next"}
            </AppText>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
