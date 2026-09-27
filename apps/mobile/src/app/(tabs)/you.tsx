import { router } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Autonomy } from "../../types";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

const MODES: { id: Autonomy; title: string; body: string }[] = [
  { id: "assisted", title: "Assisted", body: "I’ll recommend the next step. You approve it." },
  { id: "automated", title: "Automated", body: "I’ll handle routine steps, and stop when a decision is yours." },
  { id: "autonomous", title: "Autonomous", body: "I’ll keep going, and interrupt only when you’re needed." },
];

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const { state, editMemory, setAutonomy, signOut } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const mode = MODES.find((item) => item.id === state.autonomy) ?? MODES[1];

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 18 }}>
      <AppText size={34} weight="600">
        You
      </AppText>
      <Glass radius={24} style={{ padding: 18, gap: 4 }}>
        <AppText size={13} weight="600" color={theme.faint}>
          {state.session?.role}
        </AppText>
        <AppText size={24} weight="600">
          {state.organisation?.name}
        </AppText>
        <AppText size={16} color={theme.soft}>
          {state.session?.name} · {state.session?.email}
        </AppText>
      </Glass>

      <View style={{ gap: 8 }}>
        <AppText size={13} weight="600" color={theme.faint}>
          What JobGrid remembers
        </AppText>
        {state.memory.map((fact) => (
          <Glass key={fact.id} radius={20} style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText size={13} color={theme.faint}>
                {fact.label}
                {fact.inferred ? " · Inferred" : ""}
              </AppText>
              <PressableScale
                label={`Edit ${fact.label}`}
                onPress={() => {
                  setEditing(fact.id);
                  setValue(fact.value);
                }}
              >
                <AppText size={14} weight="600">
                  Edit
                </AppText>
              </PressableScale>
            </View>
            {editing === fact.id ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  accessibilityLabel={fact.label}
                  style={{
                    minHeight: 44,
                    color: theme.ink,
                    fontSize: 16,
                    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
                  }}
                />
                <PressableScale
                  label="Save"
                  onPress={() => {
                    if (value.trim()) editMemory(fact.id, value.trim());
                    setEditing(null);
                  }}
                >
                  <AppText size={15} weight="600">
                    Save
                  </AppText>
                </PressableScale>
              </View>
            ) : (
              <AppText size={16}>{fact.value}</AppText>
            )}
          </Glass>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <AppText size={13} weight="600" color={theme.faint}>
          How far JobGrid goes
        </AppText>
        <Glass radius={22} style={{ padding: 6, flexDirection: "row" }}>
          {MODES.map((item) => {
            const selected = item.id === state.autonomy;
            return (
              <PressableScale key={item.id} label={item.title} onPress={() => setAutonomy(item.id)} style={{ flex: 1 }}>
                <View
                  style={{
                    borderRadius: 16,
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? theme.ink : "transparent",
                  }}
                >
                  <AppText size={13} weight="600" color={selected ? theme.white : theme.ink}>
                    {item.title}
                  </AppText>
                </View>
              </PressableScale>
            );
          })}
        </Glass>
        <AppText size={15} color={theme.soft}>
          {mode.body}
        </AppText>
      </View>

      {confirmExit ? (
        <View style={{ gap: 8 }}>
          <AppText size={16}>Sign out of {state.organisation?.name}?</AppText>
          <PressableScale
            label="Confirm sign out"
            onPress={() => {
              signOut();
              router.replace("/sign-in");
            }}
          >
            <AppText size={16} weight="600" color={theme.pass}>
              Sign out
            </AppText>
          </PressableScale>
          <PressableScale label="Stay signed in" onPress={() => setConfirmExit(false)}>
            <AppText size={16} color={theme.soft}>
              Stay
            </AppText>
          </PressableScale>
        </View>
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
