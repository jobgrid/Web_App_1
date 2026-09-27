import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { workingLabel } from "../../domain/format";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";
import { SeekerMissions } from "../../seeker/MissionsScreen";

export default function MissionsScreen() {
  const { state } = useStore();
  if (state.session?.side === "jobseeker") return <SeekerMissions />;
  return <EmployerMissions />;
}

function EmployerMissions() {
  const insets = useSafeAreaInsets();
  const { state } = useStore();

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 16 }}>
      <AppText size={34} weight="600">
        Missions
      </AppText>
      {state.missions.length === 0 ? (
        <AppText size={17} color={theme.soft}>
          When you tell JobGrid who you need, a mission shows up here.
        </AppText>
      ) : (
        state.missions.map((mission) => (
          <PressableScale key={mission.id} label={`Open ${mission.title}`} onPress={() => router.push(`/mission/${mission.id}`)}>
            <Glass radius={24} style={{ padding: 18, gap: 6 }}>
              <AppText size={13} weight="600" color={theme.good}>
                {workingLabel(mission.status)}
              </AppText>
              <AppText size={22} weight="600">
                {mission.title}
              </AppText>
              <AppText size={15} color={theme.soft}>
                {mission.location}
              </AppText>
              <AppText size={15}>{mission.statusSentence}</AppText>
              <AppText size={13} color={theme.faint}>
                {mission.counts.ready} ready to meet · {mission.counts.considered} considered
              </AppText>
            </Glass>
          </PressableScale>
        ))
      )}
    </ScrollView>
  );
}
