import { router } from "expo-router";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { modeBody } from "../domain/move";
import { useStore } from "../state/store";
import { Glass } from "../ui/Glass";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

export function SeekerMissions() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const profile = state.seeker.profile;
  const opportunity = state.seeker.opportunity;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 16 }}>
      <AppText size={34} weight="600">
        Missions
      </AppText>
      {!profile ? (
        <AppText size={17} color={theme.soft}>
          When you tell JobGrid what would make you move, it shows up here.
        </AppText>
      ) : (
        <PressableScale label="Open preferences" onPress={() => router.push("/seeker/preferences")}>
          <Glass radius={24} style={{ padding: 18, gap: 6 }}>
            <AppText size={13} weight="600" color={theme.good}>
              Looking
            </AppText>
            <AppText size={22} weight="600">
              A {profile.role?.toLowerCase()} role worth moving for
            </AppText>
            <AppText size={15}>{state.seeker.confirm}</AppText>
            <AppText size={14} color={theme.soft}>
              {modeBody(state.seeker.mode)}
            </AppText>
            <AppText size={13} color={theme.faint}>
              {state.seeker.watch.assessed} assessed · {state.seeker.watch.close} close · {state.seeker.watch.worthInterrupting} worth interrupting
            </AppText>
          </Glass>
        </PressableScale>
      )}
      {opportunity && opportunity.status !== "declined" ? (
        <PressableScale label={`Open ${opportunity.practice}`} onPress={() => router.push(`/opportunity/${opportunity.id}`)}>
          <Glass radius={24} style={{ padding: 18, gap: 4 }}>
            <AppText size={13} weight="600" color={theme.faint}>
              {opportunity.status === "shared" ? "Introduction sent" : "Worth interrupting you"}
            </AppText>
            <AppText size={20} weight="600">
              {opportunity.practice}
            </AppText>
            <AppText size={15} color={theme.soft}>
              {opportunity.salaryLabel} · {opportunity.commuteMinutes}-minute commute
            </AppText>
          </Glass>
        </PressableScale>
      ) : null}
      {profile ? (
        <PressableScale label="Open profile" onPress={() => router.push("/seeker/profile")}>
          <AppText size={16} color={theme.soft}>
            Profile
          </AppText>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}
