import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./src/lib/supabase";
import { colors } from "./src/theme";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ChatListScreen } from "./src/screens/ChatListScreen";
import { ChatThreadScreen } from "./src/screens/ChatThreadScreen";
import { JobsScreen } from "./src/screens/JobsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

type Tab = "jobs" | "chat" | "profile";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <View style={styles.root} />;

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <AuthScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {openConversationId ? (
          <ChatThreadScreen
            conversationId={openConversationId}
            userId={session.user.id}
            onBack={() => setOpenConversationId(null)}
          />
        ) : tab === "jobs" ? (
          <JobsScreen userId={session.user.id} />
        ) : tab === "chat" ? (
          <ChatListScreen userId={session.user.id} onOpen={setOpenConversationId} />
        ) : (
          <ProfileScreen userId={session.user.id} />
        )}
      </View>
      {!openConversationId && (
        <View style={styles.tabBar}>
          {(
            [
              { id: "jobs", label: "Jobs" },
              { id: "chat", label: "Chat" },
              { id: "profile", label: "Profile" },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tabItem}
              onPress={() => setTab(item.id)}
            >
              <Text style={[styles.tabLabel, tab === item.id && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  tabLabelActive: { color: colors.primary },
});
