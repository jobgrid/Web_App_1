import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { workingLabel } from "../../domain/format";
import { EXAMPLE_PROMPTS, SAVED_RECEPTIONIST_DESCRIPTION, transcribeUtterance } from "../../services";
import { useStore } from "../../state/store";
import { Composer } from "../../ui/Composer";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";
import { Thread } from "../../ui/Thread";
import { SeekerHome } from "../../seeker/HomeScreen";

export default function HomeScreen() {
  const { state } = useStore();
  if (state.session?.side === "jobseeker") return <SeekerHome />;
  return <EmployerHome />;
}

function EmployerHome() {
  const insets = useSafeAreaInsets();
  const { state, submitText, updateDraftRequirements, clearDraft, startHiring } = useStore();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const draft = state.draft;
  const mission = state.missions[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const send = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const result = submitText(trimmed);
    setText("");
    if (result.kind === "mission") router.push(`/mission/${result.missionId}`);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: 16, gap: 22, flexGrow: 1 }}
      >
        {!draft ? (
          <View style={{ gap: 10, marginTop: 12 }}>
            <AppText size={15} color={theme.soft}>
              {greeting}
              {state.organisation ? ` · ${state.organisation.name}` : ""}
            </AppText>
            <AppText size={42} weight="600" style={{ lineHeight: 48 }}>
              Who do you need?
            </AppText>
            <AppText size={18} color={theme.soft}>
              Describe the person or team you’re looking for.
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText size={20} weight="600">
              Who do you need?
            </AppText>
            <PressableScale label="Start over" onPress={clearDraft}>
              <AppText size={15} color={theme.soft}>
                Start over
              </AppText>
            </PressableScale>
          </View>
        )}

        {mission && !draft ? (
          <PressableScale label={`Open ${mission.title}`} onPress={() => router.push(`/mission/${mission.id}`)}>
            <Glass radius={24} style={{ padding: 18, gap: 4 }}>
              <AppText size={13} weight="600" color={theme.good}>
                {workingLabel(mission.status)}
              </AppText>
              <AppText size={20} weight="600">
                {mission.title}
              </AppText>
              <AppText size={15} color={theme.soft}>
                {mission.location} · {mission.statusSentence}
              </AppText>
            </Glass>
          </PressableScale>
        ) : null}

        {draft ? (
          <Thread
            messages={draft.messages}
            requirements={draft.requirements}
            candidates={state.candidates}
            onChoice={(label) => send(label)}
            onStart={() => {
              const id = startHiring();
              if (id) router.push(`/mission/${id}`);
            }}
            onChangeRequirements={updateDraftRequirements}
            onOpenCandidate={(id) => router.push(`/candidate/${id}`)}
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 84, gap: 10 }}>
        {!draft ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLE_PROMPTS.map((prompt) => (
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
          placeholder="Find me a practice manager in Sydney…"
          onVoice={() => setListening(true)}
          onAttach={() => setAttachOpen(true)}
        />
      </View>

      {listening ? (
        <VoiceCapture
          onClose={() => setListening(false)}
          onText={(heard) => {
            setText(heard);
            setListening(false);
          }}
        />
      ) : null}
      {attachOpen ? (
        <AttachSheet
          onClose={() => setAttachOpen(false)}
          onUse={(value) => {
            setText(value);
            setAttachOpen(false);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function VoiceCapture({ onText, onClose }: { onText: (text: string) => void; onClose: () => void }) {
  const [heard, setHeard] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void transcribeUtterance().then((value) => {
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

function AttachSheet({ onClose, onUse }: { onClose: () => void; onUse: (text: string) => void }) {
  const [paste, setPaste] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  return (
    <View style={sheetStyle}>
      <Glass radius={28} style={{ padding: 22, gap: 12 }}>
        <AppText size={22} weight="600">
          Add a description
        </AppText>
        <PressableScale label="Use saved receptionist description" onPress={() => onUse(SAVED_RECEPTIONIST_DESCRIPTION)}>
          <AppText size={16} weight="600">
            Use our receptionist description
          </AppText>
        </PressableScale>
        <TextInput
          value={paste}
          onChangeText={setPaste}
          placeholder="Or paste a job description"
          placeholderTextColor={theme.faint}
          multiline
          accessibilityLabel="Paste a job description"
          style={{
            minHeight: 90,
            borderRadius: 16,
            padding: 12,
            backgroundColor: "rgba(255,252,247,0.7)",
            color: theme.ink,
            fontSize: 16,
            ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
          }}
        />
        {hint ? (
          <AppText size={14} color={theme.pass}>
            {hint}
          </AppText>
        ) : null}
        <PressableScale
          label="Use pasted description"
          onPress={() => {
            if (!paste.trim()) {
              setHint("Paste a description, or use the saved one.");
              return;
            }
            onUse(paste.trim());
          }}
        >
          <View style={darkButton}>
            <AppText size={16} weight="600" color={theme.white}>
              Use this
            </AppText>
          </View>
        </PressableScale>
        <PressableScale label="Close" onPress={onClose}>
          <AppText size={16} color={theme.soft}>
            Close
          </AppText>
        </PressableScale>
      </Glass>
    </View>
  );
}

const sheetStyle = {
  position: "absolute" as const,
  left: 16,
  right: 16,
  bottom: 120,
};

const darkButton = {
  backgroundColor: theme.ink,
  borderRadius: 22,
  minHeight: 48,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};
