import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatMoney } from "../../domain/format";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { Icon } from "../../ui/Icon";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { state, editPreference } = useStore();
  const profile = state.seeker.profile;
  const floor = profile?.preferences.find((item) => item.category === "salary_floor");

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 28, gap: 14 }}>
      <PressableScale label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/you"))} style={{ width: 44, height: 44 }}>
        <Icon name="back" />
      </PressableScale>
      <AppText size={34} weight="600">
        Preferences
      </AppText>
      <AppText size={16} color={theme.soft}>
        {state.seeker.confirm ?? "Tell JobGrid what would make you move."}
      </AppText>
      {profile?.preferences.map((item) => (
        <Glass key={item.id} radius={20} style={{ padding: 14, gap: 8 }}>
          <AppText size={17} weight="600">
            {item.description}
          </AppText>
          <PressableScale label={`${item.mandatory ? "Essential" : "Nice to have"}: ${item.description}`} onPress={() => editPreference(item.id, !item.mandatory, item.amount)}>
            <AppText size={14} color={item.mandatory ? theme.good : theme.soft}>
              {item.mandatory ? "Essential" : "Nice to have"}
            </AppText>
          </PressableScale>
        </Glass>
      ))}
      {floor?.amount ? (
        <View style={{ gap: 8 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Move from {formatMoney(floor.amount)}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[110000, 120000, 130000, 140000].map((amount) => (
              <PressableScale key={amount} label={formatMoney(amount)} onPress={() => editPreference(floor.id, true, amount)}>
                <Glass radius={999} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: floor.amount === amount ? theme.ink : undefined }}>
                  <AppText size={14} weight="600" color={floor.amount === amount ? theme.white : theme.ink}>
                    {formatMoney(amount)}
                  </AppText>
                </Glass>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : (
        <AppText size={16} color={theme.soft}>
          Preferences appear after you tell JobGrid what would make you move.
        </AppText>
      )}
    </ScrollView>
  );
}
