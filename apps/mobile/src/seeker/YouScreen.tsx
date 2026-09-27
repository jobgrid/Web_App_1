import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { disclosureLine } from "../domain/move";
import { useStore } from "../state/store";
import { Glass } from "../ui/Glass";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";
import type { ConsentSettings, ContactSetting, IdentitySetting, SalaryVisibility, VisibilitySetting } from "../types";

const VISIBILITY: { id: VisibilitySetting; label: string }[] = [
  { id: "hidden", label: "Hidden" },
  { id: "matched_only", label: "Matched only" },
  { id: "open", label: "Open" },
];
const CONTACT: { id: ContactSetting; label: string }[] = [
  { id: "jobgrid_only", label: "Only JobGrid" },
  { id: "practice_through_jobgrid", label: "Practice, through JobGrid" },
];
const IDENTITY: { id: IdentitySetting; label: string }[] = [
  { id: "withheld", label: "Name withheld" },
  { id: "first_name", label: "First name" },
  { id: "full_name", label: "Full name" },
];
const SALARY: { id: SalaryVisibility; label: string }[] = [
  { id: "hidden", label: "Pay hidden" },
  { id: "move_range", label: "Move range" },
  { id: "exact", label: "Exact pay" },
];

export function SeekerYou() {
  const insets = useSafeAreaInsets();
  const { state, setConsent, signOut } = useStore();
  const [confirmExit, setConfirmExit] = useState(false);
  const consent = state.seeker.consent;
  const profile = state.seeker.profile;
  const summary = profile ? disclosureLine(consent, profile, state.session?.name ?? "you") : "Set what JobGrid may share before anyone hears about you.";

  const patch = (next: Partial<ConsentSettings>) => setConsent({ ...consent, ...next });

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 16 }}>
      <AppText size={34} weight="600">
        You
      </AppText>
      <Glass radius={24} style={{ padding: 18, gap: 4 }}>
        <AppText size={13} weight="600" color={theme.faint}>
          Candidate
        </AppText>
        <AppText size={24} weight="600">
          {state.session?.name}
        </AppText>
        <AppText size={16} color={theme.soft}>
          {state.session?.email}
        </AppText>
      </Glass>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <PressableScale label="Open profile" onPress={() => router.push("/seeker/profile")}>
          <AppText size={16} weight="600">
            Profile
          </AppText>
        </PressableScale>
        <PressableScale label="Open preferences" onPress={() => router.push("/seeker/preferences")}>
          <AppText size={16} weight="600">
            Preferences
          </AppText>
        </PressableScale>
      </View>
      <AppText size={13} weight="600" color={theme.faint}>
        Consent
      </AppText>
      <ChoiceRow label="Visibility" options={VISIBILITY} selected={consent.visibility} onSelect={(id) => patch({ visibility: id })} />
      <ChoiceRow label="Who can contact you" options={CONTACT} selected={consent.contact} onSelect={(id) => patch({ contact: id })} />
      <ChoiceRow label="Identity" options={IDENTITY} selected={consent.identity} onSelect={(id) => patch({ identity: id })} />
      <ChoiceRow label="Salary visibility" options={SALARY} selected={consent.salary} onSelect={(id) => patch({ salary: id })} />
      <AppText size={15} color={theme.soft}>
        {summary}
      </AppText>
      {confirmExit ? (
        <PressableScale
          label="Confirm sign out"
          onPress={() => {
            signOut();
            router.replace("/role");
          }}
        >
          <AppText size={16} weight="600" color={theme.pass}>
            Sign out
          </AppText>
        </PressableScale>
      ) : (
        <PressableScale label="Sign out" onPress={() => setConfirmExit(true)}>
          <AppText size={16} color={theme.soft}>
            Sign out
          </AppText>
        </PressableScale>
      )}
    </ScrollView>
  );
}

function ChoiceRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText size={15} weight="600">
        {label}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const on = option.id === selected;
          return (
            <PressableScale key={option.id} label={option.label} onPress={() => onSelect(option.id)}>
              <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: on ? theme.ink : "rgba(255,252,247,0.72)" }}>
                <AppText size={13} weight="600" color={on ? theme.white : theme.ink}>
                  {option.label}
                </AppText>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
