import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

const AREAS = ["Lane Cove", "Chatswood", "Artarmon"];
const PASS_REASONS = ["The commute still isn't right", "The days don't work", "The pay isn't enough", "I don't want to move yet"];

export default function OpportunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, showInterest, setHomeArea, askOpportunity, declineOpportunity } = useStore();
  const opportunity = state.seeker.opportunity?.id === id ? state.seeker.opportunity : null;
  const profile = state.seeker.profile;
  const [text, setText] = useState("");
  const [passing, setPassing] = useState(false);

  if (!opportunity || !profile) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <AppText size={18}>That opportunity isn’t here.</AppText>
        <PressableScale label="Go home" onPress={() => router.replace("/(tabs)")}>
          <AppText size={16} color={theme.soft}>
            Go home
          </AppText>
        </PressableScale>
      </View>
    );
  }

  const askHome = opportunity.status === "interested" && !profile.homeArea && state.seeker.consent.visibility !== "hidden";

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 28, gap: 16 }}>
      <PressableScale label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={{ width: 44, height: 44 }}>
        <Icon name="back" />
      </PressableScale>
      <AppText size={13} weight="600" color={theme.faint}>
        Opportunity
      </AppText>
      <AppText size={32} weight="600">
        {opportunity.practice}
      </AppText>
      <AppText size={16} color={theme.soft}>
        {opportunity.salaryLabel} · {opportunity.commuteMinutes}-minute commute · {opportunity.schedule} · {opportunity.week}
      </AppText>

      {state.seeker.conversation.map((note) => (
        <View key={note.id} style={{ alignItems: note.role === "candidate" ? "flex-end" : "stretch" }}>
          {note.role === "candidate" ? (
            <View style={{ maxWidth: "86%", backgroundColor: theme.ink, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText size={16} color={theme.white}>
                {note.text}
              </AppText>
            </View>
          ) : (
            <AppText size={18}>{note.text}</AppText>
          )}
        </View>
      ))}

      {askHome ? (
        <View style={{ gap: 8 }}>
          <AppText size={16} weight="600">
            Where should the commute start?
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AREAS.map((area) => (
              <PressableScale key={area} label={area} onPress={() => setHomeArea(area)}>
                <Glass radius={999} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                  <AppText size={15} weight="600">
                    {area}
                  </AppText>
                </Glass>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}

      {opportunity.status === "new" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <PressableScale label="Interested" onPress={showInterest}>
            <View style={{ backgroundColor: theme.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText size={15} weight="600" color={theme.white}>
                Interested
              </AppText>
            </View>
          </PressableScale>
          <PressableScale label="Not for me" onPress={() => setPassing(true)}>
            <AppText size={15} weight="600" color={theme.pass}>
              Not for me
            </AppText>
          </PressableScale>
        </View>
      ) : null}

      {passing
        ? PASS_REASONS.map((reason) => (
            <PressableScale
              key={reason}
              label={reason}
              onPress={() => {
                declineOpportunity(reason);
                setPassing(false);
              }}
            >
              <AppText size={16}>{reason}</AppText>
            </PressableScale>
          ))
        : null}

      <Glass radius={22} style={{ padding: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Ask JobGrid"
          placeholderTextColor={theme.faint}
          accessibilityLabel="Ask JobGrid"
          style={{
            minHeight: 48,
            paddingHorizontal: 12,
            color: theme.ink,
            fontSize: 16,
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
          }}
        />
      </Glass>
      <PressableScale
        label="Send question"
        onPress={() => {
          if (!text.trim()) {
            askOpportunity("");
            return;
          }
          askOpportunity(text.trim());
          setText("");
        }}
      >
        <AppText size={16} weight="600">
          Ask
        </AppText>
      </PressableScale>
    </ScrollView>
  );
}
