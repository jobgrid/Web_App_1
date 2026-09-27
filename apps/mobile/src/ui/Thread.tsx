import { View } from "react-native";
import { proposeSlots } from "../domain/schedule";
import { sourceLabel } from "../domain/format";
import type { Candidate, ChatMessage, Requirement } from "../types";
import { ComparisonView } from "./ComparisonView";
import { Glass } from "./Glass";
import { PressableScale } from "./PressableScale";
import { Requirements } from "./Requirements";
import { AppText } from "./Text";
import { theme } from "./theme";

export function Thread({
  messages,
  requirements,
  candidates,
  missionRequirements,
  onChoice,
  onStart,
  onChangeRequirements,
  onOpenCandidate,
  onBook,
  explain,
}: {
  messages: ChatMessage[];
  requirements?: Requirement[];
  candidates: Candidate[];
  missionRequirements?: Requirement[];
  onChoice?: (label: string) => void;
  onStart?: () => void;
  onChangeRequirements?: (requirements: Requirement[]) => void;
  onOpenCandidate: (id: string) => void;
  onBook?: (candidateId: string, slotLabel: string) => void;
  explain?: (candidateId: string) => string;
}) {
  let latestRequirements = -1;
  messages.forEach((message, index) => {
    if (message.blocks?.some((block) => block.type === "requirements")) latestRequirements = index;
  });

  return (
    <View style={{ gap: 22 }}>
      {messages.map((message, messageIndex) => (
        <View key={message.id} style={{ gap: 12, alignItems: message.role === "employer" ? "flex-end" : "stretch" }}>
          {message.role === "jobgrid" ? (
            <AppText size={13} weight="600" color={theme.faint}>
              JobGrid
            </AppText>
          ) : null}
          {message.role === "employer" ? (
            <View style={{ maxWidth: "86%", backgroundColor: theme.ink, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12 }}>
              <AppText size={16} color={theme.white}>
                {message.text}
              </AppText>
            </View>
          ) : (
            <AppText size={22} weight="600">
              {message.text}
            </AppText>
          )}
          {message.blocks?.map((block, index) => {
            if (block.type === "requirements" && requirements && messageIndex === latestRequirements) {
              return <Requirements key={`${message.id}-req`} requirements={requirements} onChange={onChangeRequirements} />;
            }
            if (block.type === "question" && onChoice) {
              return (
                <View key={`${message.id}-q`} style={{ gap: 10 }}>
                  <AppText size={18}>{block.prompt}</AppText>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {block.choices.map((choice) => (
                      <PressableScale key={choice.id} label={choice.label} onPress={() => onChoice(choice.label)}>
                        <Glass radius={999} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                          <AppText size={16} weight="600">
                            {choice.label}
                          </AppText>
                        </Glass>
                      </PressableScale>
                    ))}
                  </View>
                </View>
              );
            }
            if (block.type === "start" && onStart) {
              return (
                <PressableScale key={`${message.id}-start`} label="Start hiring" onPress={onStart}>
                  <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 56, alignItems: "center", justifyContent: "center" }}>
                    <AppText size={17} weight="600" color={theme.white}>
                      Start hiring
                    </AppText>
                  </View>
                </PressableScale>
              );
            }
            if (block.type === "explanation") {
              const candidate = candidates.find((item) => item.id === block.candidateId);
              if (!candidate) return null;
              return (
                <PressableScale key={`${message.id}-ex-${index}`} label={`Open ${candidate.name}`} onPress={() => onOpenCandidate(candidate.id)}>
                  <Glass radius={24} style={{ padding: 16, gap: 8 }}>
                    {explain ? (
                      <AppText size={16} color={theme.soft}>
                        {explain(candidate.id)}
                      </AppText>
                    ) : null}
                    {candidate.evidence.slice(0, 3).map((item) => (
                      <AppText key={item.id} size={15}>
                        {item.statement}{" "}
                        <AppText size={13} color={theme.faint}>
                          {sourceLabel(item.source)}
                        </AppText>
                      </AppText>
                    ))}
                    <AppText size={14} weight="600">
                      Open {candidate.name}
                    </AppText>
                  </Glass>
                </PressableScale>
              );
            }
            if (block.type === "comparison" && missionRequirements) {
              const pair = block.candidateIds.map((id) => candidates.find((item) => item.id === id));
              if (!pair[0] || !pair[1]) return null;
              return (
                <ComparisonView
                  key={`${message.id}-cmp`}
                  candidates={[pair[0], pair[1]]}
                  requirements={missionRequirements}
                  onOpen={onOpenCandidate}
                />
              );
            }
            if (block.type === "schedule" && onBook) {
              const candidate = candidates.find((item) => item.id === block.candidateId);
              if (!candidate) return null;
              return (
                <View key={`${message.id}-time`} style={{ gap: 8 }}>
                  {proposeSlots().map((slot) => (
                    <PressableScale key={slot.id} label={slot.label} onPress={() => onBook(candidate.id, slot.label)}>
                      <Glass radius={20} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                        <AppText size={16} weight="600">
                          {slot.label}
                        </AppText>
                        <AppText size={13} color={theme.soft}>
                          {slot.detail}
                        </AppText>
                      </Glass>
                    </PressableScale>
                  ))}
                </View>
              );
            }
            return null;
          })}
        </View>
      ))}
    </View>
  );
}
