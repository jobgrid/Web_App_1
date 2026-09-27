import { View } from "react-native";
import { compareCandidates } from "../domain/compare";
import { fitLabel, firstName } from "../domain/format";
import type { Candidate, Requirement } from "../types";
import { Glass } from "./Glass";
import { PressableScale } from "./PressableScale";
import { AppText } from "./Text";
import { theme } from "./theme";

export function ComparisonView({
  candidates,
  requirements,
  onOpen,
}: {
  candidates: [Candidate, Candidate];
  requirements: Requirement[];
  onOpen: (id: string) => void;
}) {
  const comparison = compareCandidates(candidates[0], candidates[1], requirements);
  return (
    <View style={{ gap: 12 }}>
      <Glass radius={24} style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {candidates.map((candidate) => (
            <PressableScale key={candidate.id} label={`Open ${candidate.name}`} onPress={() => onOpen(candidate.id)} style={{ flex: 1 }}>
              <View style={{ gap: 2 }}>
                <AppText size={16} weight="600">
                  {firstName(candidate.name)}
                </AppText>
                <AppText size={12} color={candidate.fit === "strong_fit" ? theme.good : theme.warn}>
                  {fitLabel(candidate.fit)}
                </AppText>
              </View>
            </PressableScale>
          ))}
        </View>
        {comparison.rows.map((row) => (
          <View key={row.label} style={{ gap: 4 }}>
            <AppText size={12} color={theme.faint} weight="600">
              {row.label}
            </AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {row.values.map((value, index) => (
                <AppText key={`${row.label}-${index}`} size={14} style={{ flex: 1 }}>
                  {value}
                </AppText>
              ))}
            </View>
          </View>
        ))}
      </Glass>
    </View>
  );
}
