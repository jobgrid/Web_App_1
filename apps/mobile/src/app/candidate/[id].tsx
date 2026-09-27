import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fitLabel, firstName, interestLabel, sourceLabel } from "../../domain/format";
import { explainFor, useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

const REASONS = [
  "Can't start soon enough",
  "Salary doesn't work",
  "Experience isn't right for the role",
  "Not the right person for the team",
];

export default function CandidateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { state, ask, pass } = useStore();
  const candidate = state.candidates.find((item) => item.id === id);
  const [passing, setPassing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const others = state.candidates.filter((item) => item.missionId === candidate?.missionId && item.id !== candidate?.id && !item.passedReason);

  if (!candidate) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <AppText size={22} weight="600">
          That person isn’t on this mission.
        </AppText>
      </View>
    );
  }

  const why = explainFor(state, candidate.id);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 140, gap: 16 }}>
        <PressableScale label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace(`/mission/${candidate.missionId}`))} style={{ width: 44, height: 44 }}>
          <Icon name="back" />
        </PressableScale>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.ink, alignItems: "center", justifyContent: "center" }}>
            <AppText size={20} weight="600" color={theme.white}>
              {candidate.initials}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText size={28} weight="600">
              {candidate.name}
            </AppText>
            <AppText size={16} color={theme.soft}>
              {candidate.role} · {candidate.location}
            </AppText>
          </View>
        </View>
        <AppText size={16} color={theme.soft}>
          {candidate.availability} · {candidate.salaryLabel} · {interestLabel(candidate.interest)}
        </AppText>
        <AppText size={14} weight="600" color={candidate.fit === "strong_fit" ? theme.good : theme.warn}>
          {fitLabel(candidate.fit)}
        </AppText>
        {candidate.interviewLabel ? (
          <Glass radius={18} style={{ padding: 14 }}>
            <AppText size={16} weight="600">
              Meeting {candidate.interviewLabel}
            </AppText>
          </Glass>
        ) : null}
        <View style={{ gap: 8 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Why {firstName(candidate.name)}
          </AppText>
          <AppText size={18}>{why}</AppText>
        </View>
        <View style={{ gap: 10 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Evidence
          </AppText>
          {candidate.evidence.map((item) => (
            <View key={item.id} style={{ gap: 2 }}>
              <AppText size={16}>{item.statement}</AppText>
              <AppText size={13} color={theme.faint}>
                {sourceLabel(item.source)} · {item.recency}
              </AppText>
            </View>
          ))}
        </View>
        {candidate.concerns.length ? (
          <View style={{ gap: 6 }}>
            <AppText size={13} weight="600" color={theme.faint}>
              Worth knowing
            </AppText>
            {candidate.concerns.map((concern) => (
              <AppText key={concern.id} size={16}>
                {concern.text}
              </AppText>
            ))}
          </View>
        ) : null}
        <PressableScale label={historyOpen ? "Hide background" : "Show background"} onPress={() => setHistoryOpen((open) => !open)}>
          <AppText size={15} weight="600">
            {historyOpen ? "Hide background" : "Background"}
          </AppText>
        </PressableScale>
        {historyOpen
          ? candidate.history.map((span) => (
              <View key={`${span.place}-${span.period}`}>
                <AppText size={16} weight="600">
                  {span.title}
                </AppText>
                <AppText size={15} color={theme.soft}>
                  {span.place} · {span.period}
                </AppText>
              </View>
            ))
          : null}
        {others[0] ? (
          <PressableScale
            label={`Compare with ${firstName(others[0].name)}`}
            onPress={() => {
              ask(candidate.missionId, `Compare ${firstName(candidate.name)} with ${firstName(others[0].name)}`);
              router.push(`/mission/${candidate.missionId}`);
            }}
          >
            <AppText size={16} weight="600">
              Compare with {firstName(others[0].name)} on the mission
            </AppText>
          </PressableScale>
        ) : null}
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 16), gap: 8 }}>
        {passing ? (
          <Glass radius={24} style={{ padding: 16, gap: 8 }}>
            <AppText size={16} weight="600">
              Why isn’t {firstName(candidate.name)} right?
            </AppText>
            {REASONS.map((reason) => (
              <PressableScale
                key={reason}
                label={reason}
                onPress={() => {
                  pass(candidate.id, reason);
                  router.replace(`/mission/${candidate.missionId}`);
                }}
              >
                <AppText size={15}>{reason}</AppText>
              </PressableScale>
            ))}
            <PressableScale label="Cancel" onPress={() => setPassing(false)}>
              <AppText size={15} color={theme.soft}>
                Cancel
              </AppText>
            </PressableScale>
          </Glass>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PressableScale label={`Meet ${firstName(candidate.name)}`} onPress={() => router.push(`/schedule/${candidate.id}`)} style={{ flex: 1.2 }}>
              <View style={{ backgroundColor: theme.ink, borderRadius: 24, minHeight: 52, alignItems: "center", justifyContent: "center" }}>
                <AppText size={16} weight="600" color={theme.white}>
                  Meet
                </AppText>
              </View>
            </PressableScale>
            <PressableScale
              label="Ask JobGrid"
              onPress={() => {
                ask(candidate.missionId, `Why ${firstName(candidate.name)}?`);
                router.push(`/mission/${candidate.missionId}`);
              }}
              style={{ flex: 1 }}
            >
              <Glass radius={24} style={{ minHeight: 52, alignItems: "center", justifyContent: "center" }}>
                <AppText size={15} weight="600">
                  Ask
                </AppText>
              </Glass>
            </PressableScale>
            <PressableScale label="Pass" onPress={() => setPassing(true)} style={{ flex: 1 }}>
              <Glass radius={24} style={{ minHeight: 52, alignItems: "center", justifyContent: "center" }}>
                <AppText size={15} weight="600" color={theme.pass}>
                  Pass
                </AppText>
              </Glass>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
}
