import { router } from "expo-router";
import { View } from "react-native";
import { PressableScale } from "../ui/PressableScale";
import { AppText } from "../ui/Text";

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
      <AppText size={22} weight="600">
        That screen isn’t part of JobGrid.
      </AppText>
      <PressableScale label="Go home" onPress={() => router.replace("/")}>
        <AppText size={16}>Go home</AppText>
      </PressableScale>
    </View>
  );
}
