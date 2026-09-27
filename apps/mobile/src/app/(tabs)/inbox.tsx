import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../state/store";
import { Glass } from "../../ui/Glass";
import { PressableScale } from "../../ui/PressableScale";
import { AppText } from "../../ui/Text";
import { theme } from "../../ui/theme";
import { SeekerInbox } from "../../seeker/InboxScreen";

export default function InboxScreen() {
  const { state } = useStore();
  if (state.session?.side === "jobseeker") return <SeekerInbox />;
  return <EmployerInbox />;
}

function EmployerInbox() {
  const insets = useSafeAreaInsets();
  const { state, pass, resolveInbox } = useStore();
  const open = state.inbox.filter((item) => !item.resolution);
  const done = state.inbox.filter((item) => item.resolution);

  const act = (itemId: string, actionId: string, candidateId?: string) => {
    if (actionId === "view" && candidateId) router.push(`/candidate/${candidateId}`);
    else if (actionId === "meet" && candidateId) router.push(`/schedule/${candidateId}`);
    else if (actionId === "keep") resolveInbox(itemId, "Kept in the mix");
    else if (actionId === "release" && candidateId) {
      pass(candidateId, "Can start in five weeks, past the three-week preference");
      resolveInbox(itemId, "Let go");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 16 }}>
      <AppText size={34} weight="600">
        Inbox
      </AppText>
      {open.length === 0 ? (
        <AppText size={17} color={theme.soft}>
          You’re all caught up. JobGrid will let you know when something needs your decision.
        </AppText>
      ) : (
        open.map((item) => (
          <Glass key={item.id} radius={24} style={{ padding: 18, gap: 10 }}>
            <AppText size={20} weight="600">
              {item.title}
            </AppText>
            <AppText size={16} color={theme.soft}>
              {item.body}
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {item.actions.map((action) => (
                <PressableScale key={action.id} label={action.label} onPress={() => act(item.id, action.id, item.candidateId)}>
                  <View
                    style={{
                      backgroundColor: action.id === "meet" || action.id === "keep" ? theme.ink : "transparent",
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.ink,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <AppText size={15} weight="600" color={action.id === "meet" || action.id === "keep" ? theme.white : theme.ink}>
                      {action.label}
                    </AppText>
                  </View>
                </PressableScale>
              ))}
            </View>
          </Glass>
        ))
      )}
      {done.length ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <AppText size={13} weight="600" color={theme.faint}>
            Done
          </AppText>
          {done.map((item) => (
            <AppText key={item.id} size={15} color={theme.soft}>
              {item.title} · {item.resolution}
            </AppText>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
