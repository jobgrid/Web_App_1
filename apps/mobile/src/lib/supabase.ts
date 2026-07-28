import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// The publishable key is safe to ship in clients; RLS protects all data.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://archiddarhgjaqesmrbf.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_ytsdDG-WMYIe97I4US4tuA_GzEhMSus";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Job = {
  id: string;
  slug: string;
  title: string;
  location: string;
  is_remote: boolean;
  work_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  skills: string[];
  tier: "basic" | "branded" | "premium";
  highlights: string[];
  description: string;
  published_at: string | null;
  expires_at: string | null;
  companies: { name: string; brand_color: string } | null;
};

export type Conversation = {
  id: string;
  candidate_id: string;
  last_message_at: string;
  jobs: { title: string } | null;
  companies: { name: string } | null;
  profiles: { full_name: string } | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "voice" | "system";
  body: string;
  created_at: string;
};
