import { router } from "expo-router";
import { useState } from "react";
import { Platform, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";
import { theme } from "../ui/theme";

export default function SeekerSignInScreen() {
  const insets = useSafeAreaInsets();
  const { signInSeeker } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const continueIn = () => {
    if (!name.trim()) return setError("Add your name.");
    if (!email.includes("@") || !email.includes(".")) return setError("Add an email.");
    signInSeeker({ name, email });
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 28, paddingHorizontal: 24, paddingBottom: insets.bottom + 24, gap: 22 }}>
      <PressableScale label="Back" onPress={() => router.back()}>
        <AppText size={16} color={theme.soft}>
          Back
        </AppText>
      </PressableScale>
      <View style={{ gap: 8 }}>
        <AppText size={40} weight="600">
          Your next move
        </AppText>
        <AppText size={17} color={theme.soft}>
          JobGrid looks out for you. You don’t search a job feed.
        </AppText>
      </View>
      <Field label="Your name" value={name} onChangeText={setName} placeholder="What should we call you?" />
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboard="email-address" />
      {error ? (
        <AppText size={15} color={theme.pass}>
          {error}
        </AppText>
      ) : null}
      <View style={{ marginTop: "auto", gap: 14 }}>
        <PressableScale
          label="Use the physiotherapy profile"
          onPress={() => {
            setName("Physiotherapist");
            setEmail("physio@northshore.example");
            setError(null);
          }}
        >
          <AppText size={16} color={theme.soft} style={{ textAlign: "center" }}>
            Use the physiotherapy profile
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
