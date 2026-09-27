import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { Glass } from "../ui/Glass";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

const PASS_REASONS = ["The commute still isn't right", "The days don't work", "The pay isn't enough", "I don't want to move yet"];

export function SeekerInbox() {
  const insets = useSafeAreaInsets();
  const { state, showInterest, askOpportunity, declineOpportunity } = useStore();
  const open = state.seeker.inbox.filter((item) => !item.resolution);
  const done = state.seeker.inbox.filter((item) => item.resolution);
  const [passing, setPassing] = useState<string | null>(null);

  const act = (actionId: string) => {
    if (actionId === "interested") {
      showInterest();
      const id = state.seeker.opportunity?.id;
      if (id) router.push(`/opportunity/${id}`);
    } else if (actionId === "ask") {
      askOpportunity("");
      const id = state.seeker.opportunity?.id;
      if (id) router.push(`/opportunity/${id}`);
    } else if (actionId === "pass") setPassing("open");
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 16 }}>
      <AppText size={34} weight="600">
        Inbox
      </AppText>
      {open.length === 0 ? (
        <AppText size={17} color={theme.soft}>
          You’re all caught up. JobGrid will let you know when something needs your decision.
        </AppText>
      ) : (
        open.map((item) => (
          <Glass key={item.id} radius={24} style={{ padding: 18, gap: 10 }}>
            <AppText size={20} weight="600">
              {item.title}
            </AppText>
            <AppText size={16} color={theme.soft}>
              {item.body}
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {item.actions.map((action) => (
                <PressableScale key={action.id} label={action.label} onPress={() => act(action.id)}>
                  <AppText size={15} weight="600">
                    {action.label}
                  </AppText>
                </PressableScale>
              ))}
            </View>
          </Glass>
        ))
      )}
      {passing
        ? PASS_REASONS.map((reason) => (
            <PressableScale
              key={reason}
              label={reason}
              onPress={() => {
                declineOpportunity(reason);
                setPassing(null);
              }}
            >
              <AppText size={16}>{reason}</AppText>
            </PressableScale>
          ))
        : null}
      {done.length ? (
        <View style={{ gap: 8 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Done
          </AppText>
          {done.map((item) => (
            <Glass key={item.id} radius={20} style={{ padding: 14, gap: 4 }}>
              <AppText size={16} weight="600">
                {item.title}
              </AppText>
              <AppText size={14} color={theme.soft}>
                {item.resolution}
              </AppText>
            </Glass>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
