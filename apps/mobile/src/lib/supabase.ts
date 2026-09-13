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

export type Role = "candidate" | "employer";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
};

export type Company = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  brand_color: string;
  tagline: string;
  location: string;
};

export type Job = {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  is_remote: boolean;
  work_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: string;
  skills: string[];
  tier: "basic" | "branded" | "premium";
  status: string;
  highlights: string[];
  description: string;
  published_at: string | null;
  expires_at: string | null;
  companies: { name: string; brand_color: string } | null;
};

export type Application = {
  id: string;
  job_id: string;
  candidate_id: string;
  status: "submitted" | "viewed" | "shortlisted" | "rejected" | "hired";
  source: "manual" | "batch" | "auto";
  match_score: number | null;
  created_at: string;
  jobs: {
    title: string;
    location: string;
    companies: { name: string; brand_color: string } | null;
  } | null;
  profiles?: { full_name: string } | null;
};

export type ChatRequest = {
  id: string;
  job_id: string | null;
  candidate_id: string;
  company_id: string;
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  jobs: { title: string } | null;
  companies: { name: string; brand_color: string } | null;
  profiles?: { full_name: string } | null;
};

export type Conversation = {
  id: string;
  job_id: string | null;
  candidate_id: string;
  company_id: string;
  last_message_at: string;
  jobs: { title: string } | null;
  companies: { name: string; brand_color: string } | null;
  profiles: { full_name: string } | null;
  // Filled client-side from the latest message
  preview?: { body: string; kind: string; sender_id: string; created_at: string } | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: "text" | "voice" | "system";
  body: string;
  created_at: string;
};

export type Purchase = {
  id: string;
  product_code: "basic" | "branded" | "premium";
  credits_remaining: number;
};
