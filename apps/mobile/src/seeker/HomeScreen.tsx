import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { modeBody, OPPORTUNITY_MODES } from "../domain/move";
import { SEEKER_DEMO_UTTERANCE, SEEKER_PROMPTS, transcribeUtterance } from "../services";
import { useStore } from "../state/store";
import { Composer } from "../ui/Composer";
import { Glass } from "../ui/Glass";
import { Icon } from "../ui/Icon";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";
import type { Opportunity, OpportunityMode } from "../types";

const PASS_REASONS = ["The commute still isn't right", "The days don't work", "The pay isn't enough", "I don't want to move yet"];
const HOME_AREAS = ["Lane Cove", "Chatswood", "Artarmon"];

export function SeekerHome() {
  const insets = useSafeAreaInsets();
  const { state, submitMove, startLooking, clearMove, setOpportunityMode, showInterest, askOpportunity, declineOpportunity, setHomeArea } = useStore();
  const seeker = state.seeker;
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [passing, setPassing] = useState(false);
  const draft = seeker.draft;
  const profile = seeker.profile;
  const opportunity = seeker.opportunity;
  const hidden = seeker.mode === "not_looking";
  const showCard = opportunity && opportunity.status !== "declined" && !hidden;

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    submitMove(trimmed);
    setText("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: 16, gap: 18, flexGrow: 1 }}>
        {!profile ? (
          <View style={{ gap: 10, marginTop: draft ? 0 : 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <AppText size={draft ? 28 : 42} weight="600" style={{ lineHeight: draft ? 34 : 48, flex: 1 }}>
                What would make you move?
              </AppText>
              {draft ? (
                <PressableScale label="Start over" onPress={clearMove}>
                  <AppText size={15} color={theme.soft}>
                    Start over
                  </AppText>
                </PressableScale>
              ) : null}
            </View>
            {!draft ? (
              <AppText size={18} color={theme.soft}>
                Tell JobGrid what the right opportunity looks like.
              </AppText>
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <AppText size={15} color={theme.soft}>
              {state.session?.name}
            </AppText>
            <AppText size={32} weight="600" style={{ lineHeight: 38 }}>
              JobGrid is looking out for you
            </AppText>
            {seeker.confirm ? <AppText size={16} color={theme.soft}>{seeker.confirm}</AppText> : null}
          </View>
        )}

        {draft
          ? draft.notes.map((note) => (
              <View key={note.id} style={{ alignItems: note.role === "candidate" ? "flex-end" : "stretch", gap: 8 }}>
                {note.role === "jobgrid" ? (
                  <AppText size={13} weight="600" color={theme.faint}>
                    JobGrid
                  </AppText>
                ) : null}
                {note.role === "candidate" ? (
                  <View style={{ maxWidth: "86%", backgroundColor: theme.ink, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <AppText size={16} color={theme.white}>
                      {note.text}
                    </AppText>
                  </View>
                ) : (
                  <AppText size={22} weight="600">
                    {note.text}
                  </AppText>
                )}
              </View>
            ))
          : null}

        {draft?.ready ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {draft.profile.preferences.map((item) => (
              <Glass key={item.id} radius={999} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <AppText size={14}>{item.description}</AppText>
              </Glass>
            ))}
          </View>
        ) : null}

        {draft?.question ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {draft.choices.map((choice) => (
                <PressableScale key={choice.id} label={choice.label} onPress={() => send(choice.label)}>
                  <Glass radius={999} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                    <AppText size={16} weight="600">
                      {choice.label}
                    </AppText>
                  </Glass>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        {draft?.ready ? (
          <PressableScale label="Look out for me" onPress={startLooking}>
            <View style={darkButton}>
              <AppText size={17} weight="600" color={theme.white}>
                Look out for me
              </AppText>
            </View>
          </PressableScale>
        ) : null}

        {profile ? (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Count label="Assessed" value={seeker.watch.assessed} />
              <Count label="Close" value={seeker.watch.close} />
              <Count label="Worth interrupting" value={seeker.watch.worthInterrupting} />
            </View>
            <View style={{ gap: 8 }}>
              <AppText size={13} weight="600" color={theme.faint}>
                Opportunity mode
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {OPPORTUNITY_MODES.map((mode) => (
                  <ModeChip key={mode.id} mode={mode.id} label={mode.label} selected={seeker.mode === mode.id} onPress={() => setOpportunityMode(mode.id)} />
                ))}
              </View>
              <AppText size={15} color={theme.soft}>
                {modeBody(seeker.mode)}
              </AppText>
            </View>
          </>
        ) : null}

        {showCard && opportunity ? (
          <OpportunityCard
            opportunity={opportunity}
            onInterested={() => {
              showInterest();
              router.push(`/opportunity/${opportunity.id}`);
            }}
            onAsk={() => {
              askOpportunity("");
              router.push(`/opportunity/${opportunity.id}`);
            }}
            onPass={() => setPassing(true)}
          />
        ) : null}

        {profile && !showCard && seeker.quiet ? (
          <AppText size={17} color={theme.soft}>
            {seeker.quiet}
          </AppText>
        ) : null}

        {opportunity?.status === "interested" && !opportunity.declineReason && profile && !profile.homeArea ? (
          <View style={{ gap: 8 }}>
            <AppText size={16}>Where should the commute start?</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HOME_AREAS.map((area) => (
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
      </ScrollView>

      {!profile ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 84, gap: 10 }}>
          {!draft ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SEEKER_PROMPTS.map((prompt) => (
                <PressableScale key={prompt.id} label={prompt.label} onPress={() => setText(prompt.text)}>
                  <Glass radius={999} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                    <AppText size={13}>{prompt.label}</AppText>
                  </Glass>
                </PressableScale>
              ))}
            </View>
          ) : null}
          <Composer
            value={text}
            onChangeText={setText}
            onSend={() => send(text)}
            placeholder="A physiotherapy role closer to home…"
            onVoice={() => setListening(true)}
          />
        </View>
      ) : (
        <View style={{ height: Math.max(insets.bottom, 12) + 84 }} />
      )}

      {listening ? (
        <VoiceSheet
          onClose={() => setListening(false)}
          onText={(heard) => {
            setText(heard);
            setListening(false);
          }}
        />
      ) : null}
      {passing ? (
        <View style={sheetStyle}>
          <Glass radius={28} style={{ padding: 22, gap: 12 }}>
            <AppText size={22} weight="600">
              Why isn’t this one right?
            </AppText>
            {PASS_REASONS.map((reason) => (
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
            ))}
            <PressableScale label="Cancel" onPress={() => setPassing(false)}>
              <AppText size={16} color={theme.soft}>
                Cancel
              </AppText>
            </PressableScale>
          </Glass>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <Glass radius={18} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 2 }}>
      <AppText size={22} weight="600">
        {value}
      </AppText>
      <AppText size={11} color={theme.soft} style={{ textAlign: "center" }}>
        {label}
      </AppText>
    </Glass>
  );
}

function ModeChip({ label, selected, onPress }: { mode: OpportunityMode; label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale label={label} onPress={onPress}>
      <View
        style={{
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: selected ? theme.ink : "rgba(255,252,247,0.7)",
        }}
      >
        <AppText size={13} weight="600" color={selected ? theme.white : theme.ink}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

export function OpportunityCard({
  opportunity,
  onInterested,
  onAsk,
  onPass,
}: {
  opportunity: Opportunity;
  onInterested: () => void;
  onAsk: () => void;
  onPass: () => void;
}) {
  return (
    <Glass radius={24} style={{ padding: 18, gap: 8 }}>
      <AppText size={13} weight="600" color={theme.good}>
        Worth interrupting you
      </AppText>
      <AppText size={24} weight="600">
        {opportunity.practice}
      </AppText>
      <AppText size={16} color={theme.soft}>
        {opportunity.role} · {opportunity.location}
      </AppText>
      <AppText size={16}>{opportunity.salaryLabel}</AppText>
      <AppText size={16}>{opportunity.commuteMinutes}-minute commute</AppText>
      <AppText size={16}>{opportunity.schedule}</AppText>
      <AppText size={16}>{opportunity.week}</AppText>
      {opportunity.status === "shared" ? (
        <AppText size={15} color={theme.good}>
          JobGrid will introduce you. No application.
        </AppText>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          <PressableScale label="Interested" onPress={onInterested}>
            <View style={{ backgroundColor: theme.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText size={14} weight="600" color={theme.white}>
                Interested
              </AppText>
            </View>
          </PressableScale>
          <PressableScale label="Ask JobGrid" onPress={onAsk}>
            <Glass radius={18} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText size={14} weight="600">
                Ask JobGrid
              </AppText>
            </Glass>
          </PressableScale>
          <PressableScale label="Not for me" onPress={onPass}>
            <Glass radius={18} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <AppText size={14} weight="600" color={theme.pass}>
                Not for me
              </AppText>
            </Glass>
          </PressableScale>
        </View>
      )}
    </Glass>
  );
}

function VoiceSheet({ onText, onClose }: { onText: (text: string) => void; onClose: () => void }) {
  const [heard, setHeard] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void transcribeUtterance(SEEKER_DEMO_UTTERANCE).then((value) => {
      if (live) setHeard(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <View style={sheetStyle}>
      <Glass radius={28} style={{ padding: 22, gap: 12 }}>
        <Icon name="wave" />
        <AppText size={22} weight="600">
          {heard ? "Here’s what I heard." : "Listening…"}
        </AppText>
        {heard ? <AppText size={16}>{heard}</AppText> : null}
        {heard ? (
          <PressableScale label="Use this" onPress={() => onText(heard)}>
            <View style={darkButton}>
              <AppText size={16} weight="600" color={theme.white}>
                Use this
              </AppText>
            </View>
          </PressableScale>
        ) : null}
        <PressableScale label="Cancel" onPress={onClose}>
          <AppText size={16} color={theme.soft}>
            Cancel
          </AppText>
        </PressableScale>
      </Glass>
    </View>
  );
}

const darkButton = {
  backgroundColor: theme.ink,
  borderRadius: 28,
  minHeight: 56,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const sheetStyle = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 120,
};
