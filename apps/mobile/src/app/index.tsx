import { Redirect } from "expo-router";
import { useStore } from "../state/store";

export default function Gate() {
  const { state } = useStore();
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  if (!state.session) return <Redirect href="/sign-in" />;
  return <Redirect href="/(tabs)" />;
}
