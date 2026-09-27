import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { workingLabel } from "../../domain/format";
import type { MissionCounts } from "../../types";
import { explainFor, useStore, visibleCandidates } from "../../state/store";
import { ActivityList } from "../../ui/ActivityList";
import { CandidateCard } from "../../ui/CandidateCard";
import { Composer } from "../../ui/Composer";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { Thread } from "../../ui/Thread";
import { theme } from "../../ui/theme";

const COUNTS: { key: keyof MissionCounts; label: string }[] = [
  { key: "considered", label: "Considered" },
  { key: "meetCore", label: "Meet what you asked" },
  { key: "contacted", label: "Contacted" },
  { key: "interested", label: "Interested" },
  { key: "screening", label: "Being screened" },
  { key: "ready", label: "Ready to meet" },
];

const ASKS = ["Why Sarah?", "Compare Sarah with Michael", "Who can start fastest?"];

export default function MissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, ask, book } = useStore();
  const mission = state.missions.find((item) => item.id === id);
  const [text, setText] = useState("");
  const scroll = useRef<ScrollView>(null);
  const people = mission ? visibleCandidates(state, mission.id) : [];
  const threadLength = mission ? (state.threads[mission.id]?.length ?? 0) : 0;
  useEffect(() => {
    if (threadLength) scroll.current?.scrollToEnd({ animated: true });
  }, [threadLength]);

  if (!mission) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
        <AppText size={22} weight="600">
          That mission isn’t here.
        </AppText>
        <PressableScale label="Back to missions" onPress={() => router.replace("/(tabs)/missions")}>
          <AppText size={16}>Back to missions</AppText>
        </PressableScale>
      </View>
    );
  }

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    ask(mission.id, trimmed);
    setText("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 24, gap: 18 }}
      >
        <PressableScale
          label="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/missions"))}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="back" />
        </PressableScale>
        <View style={{ gap: 6 }}>
          <AppText size={13} weight="600" color={theme.good}>
            {workingLabel(mission.status)}
          </AppText>
          <AppText size={34} weight="600">
            {mission.title}
          </AppText>
          <AppText size={16} color={theme.soft}>
            {mission.location}
          </AppText>
          <AppText size={18} accessibilityLiveRegion="polite">
            {mission.statusSentence}
          </AppText>
        </View>

        {mission.counts.considered === 0 ? (
          <SkeletonGrid />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {COUNTS.map((item) => (
              <Glass key={item.key} radius={18} style={{ width: "48%", padding: 14, flexGrow: 1 }}>
                <AppText size={26} weight="600">
                  {mission.counts[item.key]}
                </AppText>
                <AppText size={13} color={theme.soft}>
                  {item.label}
                </AppText>
              </Glass>
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Worth your attention
          </AppText>
          {people.length === 0 ? (
            <AppText size={16} color={theme.soft}>
              JobGrid is looking. I’ll interrupt you when someone is worth your attention.
            </AppText>
          ) : (
            people.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} onPress={() => router.push(`/candidate/${candidate.id}`)} />
            ))
          )}
        </View>

        <ActivityList items={mission.activity} />

        <Thread
          messages={state.threads[mission.id] ?? []}
          candidates={state.candidates}
          missionRequirements={mission.requirements}
          onOpenCandidate={(candidateId) => router.push(`/candidate/${candidateId}`)}
          onBook={(candidateId, slotLabel) => book(candidateId, slotLabel)}
          explain={(candidateId) => explainFor(state, candidateId)}
        />
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16), gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ASKS.map((askText) => (
            <PressableScale key={askText} label={askText} onPress={() => send(askText)}>
              <Glass radius={999} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <AppText size={13}>{askText}</AppText>
              </Glass>
            </PressableScale>
          ))}
        </View>
        <Composer value={text} onChangeText={setText} onSend={() => send(text)} placeholder="Ask JobGrid" />
      </View>
    </KeyboardAvoidingView>
  );
}

function SkeletonGrid() {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.9, { duration: 900 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {COUNTS.map((item) => (
        <Animated.View key={item.key} style={[{ width: "48%", height: 72, borderRadius: 18, backgroundColor: "rgba(255,252,247,0.7)" }, style]} />
      ))}
    </View>
  );
}
