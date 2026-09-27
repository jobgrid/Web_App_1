import { router } from "expo-router";
import { useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

const DEMO = {
  name: "Practice owner",
  email: "owner@harbourdental.example",
  organisation: "Harbour Dental",
  location: "Parramatta",
};

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const continueIn = () => {
    if (!name.trim()) return setError("Add your name.");
    if (!email.includes("@") || !email.includes(".")) return setError("Add a work email.");
    if (!organisation.trim()) return setError("Add your practice.");
    if (!location.trim()) return setError("Add the main location.");
    signIn({ name, email, organisation, location });
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 36, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 22 }}>
      <View style={{ gap: 8 }}>
        <AppText size={14} weight="600" color={theme.faint}>
          JobGrid
        </AppText>
        <AppText size={40} weight="600">
          Your practice
        </AppText>
        <AppText size={17} color={theme.soft}>
          This is the employer side. Tell JobGrid who you need, then decide who to meet.
        </AppText>
      </View>
      <View style={{ gap: 12 }}>
        <Field label="Your name" value={name} onChangeText={setName} placeholder="What should we call you?" />
        <Field label="Work email" value={email} onChangeText={setEmail} placeholder="you@practice.com" keyboard="email-address" />
        <Field label="Practice" value={organisation} onChangeText={setOrganisation} placeholder="Practice name" />
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="Parramatta" />
      </View>
      {error ? (
        <AppText size={15} color={theme.pass}>
          {error}
        </AppText>
      ) : null}
      <View style={{ marginTop: "auto", gap: 14 }}>
        <PressableScale
          label="Use the Parramatta practice"
          onPress={() => {
            setName(DEMO.name);
            setEmail(DEMO.email);
            setOrganisation(DEMO.organisation);
            setLocation(DEMO.location);
            setError(null);
          }}
        >
          <AppText size={16} color={theme.soft} style={{ textAlign: "center" }}>
            Use the Parramatta practice
          </AppText>
        </PressableScale>
        <PressableScale label="Continue" onPress={continueIn}>
          <View style={{ backgroundColor: theme.ink, borderRadius: 28, minHeight: 56, alignItems: "center", justifyContent: "center" }}>
            <AppText size={17} weight="600" color={theme.white}>
              Continue
            </AppText>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboard?: "email-address" | "default";
}) {
  return (
    <View style={{ gap: 6 }}>
      <AppText size={13} weight="600" color={theme.faint}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        autoCapitalize={keyboard === "email-address" ? "none" : "words"}
        keyboardType={keyboard ?? "default"}
        accessibilityLabel={label}
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
