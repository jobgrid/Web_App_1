import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { LiquidBackground } from "./src/components/LiquidBackground";
import { LiquidTabBar, type TabItem } from "./src/components/LiquidTabBar";
import { ToastHost } from "./src/components/Toast";
import { getMyCompany, getProfile, type FeedJob } from "./src/lib/data";
import { supabase, type Company, type Conversation, type Profile } from "./src/lib/supabase";
import { colors } from "./src/theme";

import { ApplicantsScreen } from "./src/screens/ApplicantsScreen";
import { ApplicationsScreen } from "./src/screens/ApplicationsScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { ChatsScreen } from "./src/screens/ChatsScreen";
import { ChatThreadScreen } from "./src/screens/ChatThreadScreen";
import { EmployerHomeScreen } from "./src/screens/EmployerHomeScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { JobDetailScreen } from "./src/screens/JobDetailScreen";
import { PostAdChatScreen } from "./src/screens/PostAdChatScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";

const CANDIDATE_TABS: TabItem[] = [
  { key: "feed", label: "For you", icon: "flash-outline", iconActive: "flash" },
  { key: "chats", label: "Chats", icon: "chatbubbles-outline", iconActive: "chatbubbles" },
  { key: "applications", label: "Applied", icon: "document-text-outline", iconActive: "document-text" },
  { key: "profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

const EMPLOYER_TABS: TabItem[] = [
  { key: "home", label: "My ads", icon: "grid-outline", iconActive: "grid" },
  { key: "chats", label: "Chats", icon: "chatbubbles-outline", iconActive: "chatbubbles" },
  { key: "applicants", label: "Talent", icon: "people-outline", iconActive: "people" },
  { key: "profile", label: "Profile", icon: "person-outline", iconActive: "person" },
];

type Overlay =
  | { type: "thread"; conversation: Conversation }
  | { type: "job"; job: FeedJob; applied: boolean }
  | { type: "postAd" }
  | null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("feed");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [homeReloadKey, setHomeReloadKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setCompany(null);
        setOverlay(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadIdentity() {
      if (!session) {
        setReady(true);
        return;
      }
      setReady(false);
      const nextProfile = await getProfile(session.user.id);
      const nextCompany =
        nextProfile?.role === "employer" ? await getMyCompany(session.user.id) : null;
      if (cancelled) return;
      setProfile(nextProfile);
      setCompany(nextCompany);
      setTab(nextProfile?.role === "employer" ? "home" : "feed");
      setReady(true);
    }
    loadIdentity();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handlePendingCount = useCallback((count: number) => setPendingRequests(count), []);

  const isEmployer = profile?.role === "employer";
  const tabs = isEmployer ? EMPLOYER_TABS : CANDIDATE_TABS;
  const tabsWithBadges = tabs.map((item) =>
    item.key === "chats" && pendingRequests > 0 ? { ...item, badge: pendingRequests } : item
  );

  let content: React.ReactNode = null;
  if (!ready) {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  } else if (!session || !profile) {
    content = <AuthScreen />;
  } else if (overlay?.type === "thread") {
    content = (
      <ChatThreadScreen
        conversation={overlay.conversation}
        userId={session.user.id}
        onBack={() => setOverlay(null)}
      />
    );
  } else if (overlay?.type === "job") {
    content = (
      <JobDetailScreen
        job={overlay.job}
        userId={session.user.id}
        initiallyApplied={overlay.applied}
        onBack={() => setOverlay(null)}
      />
    );
  } else if (overlay?.type === "postAd" && company) {
    content = (
      <PostAdChatScreen
        company={company}
        userId={session.user.id}
        onClose={() => setOverlay(null)}
        onPublished={() => setHomeReloadKey((key) => key + 1)}
      />
    );
  } else if (isEmployer && company) {
    content =
      tab === "home" ? (
        <EmployerHomeScreen
          company={company}
          userName={profile.full_name}
          onPostAd={() => setOverlay({ type: "postAd" })}
          reloadKey={homeReloadKey}
        />
      ) : tab === "chats" ? (
        <ChatsScreen
          userId={session.user.id}
          role="employer"
          onOpenConversation={(conversation) => setOverlay({ type: "thread", conversation })}
          onPendingCount={handlePendingCount}
        />
      ) : tab === "applicants" ? (
        <ApplicantsScreen company={company} />
      ) : (
        <ProfileScreen profile={profile} company={company} />
      );
  } else {
    content =
      tab === "feed" ? (
        <FeedScreen
          userId={session.user.id}
          userName={profile.full_name}
          onOpenJob={(job, applied) => setOverlay({ type: "job", job, applied })}
        />
      ) : tab === "chats" ? (
        <ChatsScreen
          userId={session.user.id}
          role="candidate"
          onOpenConversation={(conversation) => setOverlay({ type: "thread", conversation })}
        />
      ) : tab === "applications" ? (
        <ApplicationsScreen userId={session.user.id} />
      ) : (
        <ProfileScreen profile={profile} company={null} />
      );
  }

  const showTabBar = ready && session && profile && !overlay;

  return (
    <LiquidBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>{content}</View>
        {showTabBar && (
          <LiquidTabBar
            items={tabsWithBadges}
            activeKey={tab}
            onChange={setTab}
            centerAction={
              isEmployer
                ? { icon: "add", onPress: () => setOverlay({ type: "postAd" }) }
                : undefined
            }
          />
        )}
      </SafeAreaView>
      <ToastHost />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
