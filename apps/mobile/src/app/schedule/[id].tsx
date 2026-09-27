import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { firstName } from "../../domain/format";
import { proposeSlots } from "../../domain/schedule";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, book } = useStore();
  const candidate = state.candidates.find((item) => item.id === id);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [booked, setBooked] = useState<string | null>(null);
  const slots = proposeSlots();

  if (!candidate) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <AppText size={22} weight="600">
          No one to schedule.
        </AppText>
      </View>
    );
  }

  const selected = slots.find((slot) => slot.id === slotId);

  if (booked) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, justifyContent: "space-between" }}>
        <View style={{ gap: 12 }}>
          <AppText size={34} weight="600">
            I’ll ask {firstName(candidate.name)} for {booked}.
          </AppText>
          <AppText size={18} color={theme.soft}>
            You’ll only hear from me if that time doesn’t work.
          </AppText>
        </View>
        <PressableScale label="Back to the mission" onPress={() => router.replace(`/mission/${candidate.missionId}`)}>
          <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 56, alignItems: "center", justifyContent: "center" }}>
            <AppText size={17} weight="600" color={theme.white}>
              Back to the mission
            </AppText>
          </View>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 20, gap: 16 }}>
      <PressableScale label="Back" onPress={() => router.back()} style={{ width: 44, height: 44 }}>
        <Icon name="back" />
      </PressableScale>
      <AppText size={34} weight="600">
        When should {firstName(candidate.name)} come in?
      </AppText>
      <AppText size={16} color={theme.soft}>
        A short conversation at the practice. I’ll only hold one of these.
      </AppText>
      <View style={{ gap: 10 }}>
        {slots.map((slot) => {
          const active = slot.id === slotId;
          return (
            <PressableScale key={slot.id} label={slot.label} onPress={() => setSlotId(slot.id)}>
              <Glass radius={22} style={{ padding: 16, borderWidth: active ? 1.5 : 0, borderColor: theme.ink }}>
                <AppText size={18} weight="600">
                  {slot.label}
                </AppText>
                <AppText size={14} color={theme.soft}>
                  {slot.detail}
                  {active ? " · Selected" : ""}
                </AppText>
              </Glass>
            </PressableScale>
          );
        })}
      </View>
      <View style={{ marginTop: "auto" }}>
        <PressableScale
          label="Confirm time"
          disabled={!selected}
          onPress={() => {
            if (!selected) return;
            book(candidate.id, selected.label);
            setBooked(selected.label);
          }}
        >
          <View style={{ backgroundColor: selected ? theme.ink : "rgba(26,25,22,0.3)", borderRadius: 28, minHeight: 56, alignItems: "center", justifyContent: "center" }}>
            <AppText size={17} weight="600" color={theme.white}>
              {selected ? `Confirm ${selected.label}` : "Choose a time"}
            </AppText>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
