import { View } from "react-native";
import { fitLabel, interestLabel } from "../domain/format";
import type { Candidate } from "../types";
import { Glass } from "./Glass";
import { PressableScale } from "./PressableScale";
import { AppText } from "./Text";
import { theme } from "./theme";

export function CandidateCard({ candidate, onPress }: { candidate: Candidate; onPress: () => void }) {
  return (
    <PressableScale label={`Open ${candidate.name}`} onPress={onPress}>
      <Glass radius={26} style={{ padding: 18 }}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: theme.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText size={16} weight="600" color={theme.white}>
              {candidate.initials}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <AppText size={20} weight="600">
                {candidate.name}
              </AppText>
              <AppText size={13} weight="600" color={candidate.fit === "strong_fit" ? theme.good : theme.warn}>
                {fitLabel(candidate.fit)}
              </AppText>
            </View>
            <AppText size={15} color={theme.soft}>
              {candidate.role} · {candidate.location}
            </AppText>
            <AppText size={15} color={theme.soft}>
              {candidate.availability} · {candidate.salaryLabel} · {interestLabel(candidate.interest)}
            </AppText>
            <AppText size={14} style={{ marginTop: 8 }}>
              {candidate.topEvidence}
            </AppText>
            {candidate.interviewLabel ? (
              <AppText size={14} weight="600" color={theme.good} style={{ marginTop: 6 }}>
                Meeting {candidate.interviewLabel}
              </AppText>
            ) : null}
          </View>
        </View>
      </Glass>
    </PressableScale>
  );
}
