import { router } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatMoney } from "../../domain/format";
import { useStore } from "../../state/store";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, editSeekerProfile } = useStore();
  const profile = state.seeker.profile;
  const [name, setName] = useState(state.session?.name ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [pay, setPay] = useState(profile?.currentSalary ? String(profile.currentSalary) : "");
  const [saved, setSaved] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 28, gap: 16 }}>
      <PressableScale label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/you"))} style={{ width: 44, height: 44 }}>
        <Icon name="back" />
      </PressableScale>
      <AppText size={34} weight="600">
        Profile
      </AppText>
      <AppText size={16} color={theme.soft}>
        {state.session?.email}
        {profile?.currentSalary ? ` · currently ${formatMoney(profile.currentSalary)}` : ""}
      </AppText>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Role" value={role} onChangeText={setRole} />
      <Field label="Current pay" value={pay} onChangeText={setPay} keyboard="number-pad" />
      <PressableScale
        label="Save profile"
        onPress={() => {
          const amount = Number(pay.replace(/[^0-9]/g, ""));
          editSeekerProfile({ name, role, currentSalary: amount > 0 ? amount : null });
          setSaved(true);
        }}
      >
        <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 52, alignItems: "center", justifyContent: "center" }}>
          <AppText size={16} weight="600" color={theme.white}>
            Save
          </AppText>
        </View>
      </PressableScale>
      {saved ? (
        <AppText size={15} color={theme.good}>
          Saved. JobGrid will use this instead of asking again.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboard?: "number-pad" | "default";
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText size={13} weight="600" color={theme.faint}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        keyboardType={keyboard ?? "default"}
        style={{
          minHeight: 52,
          borderRadius: 16,
          paddingHorizontal: 14,
          backgroundColor: "rgba(255,252,247,0.7)",
          borderWidth: 1,
          borderColor: theme.stroke,
          color: theme.ink,
          fontSize: 17,
          ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
        }}
      />
    </View>
  );
}
