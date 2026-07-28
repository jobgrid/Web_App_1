export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_products: {
        Row: {
          code: string
          compare_at_cents: number | null
          description: string
          duration_days: number
          features: Json
          name: string
          price_cents: number
          sort: number
          tier: Database["public"]["Enums"]["ad_tier"]
        }
        Insert: {
          code: string
          compare_at_cents?: number | null
          description?: string
          duration_days: number
          features?: Json
          name: string
          price_cents: number
          sort?: number
          tier: Database["public"]["Enums"]["ad_tier"]
        }
        Update: {
          code?: string
          compare_at_cents?: number | null
          description?: string
          duration_days?: number
          features?: Json
          name?: string
          price_cents?: number
          sort?: number
          tier?: Database["public"]["Enums"]["ad_tier"]
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          candidate_id: string
          cover_note: string
          created_at: string
          cv_path: string | null
          id: string
          job_id: string
          match_score: number | null
          source: Database["public"]["Enums"]["application_source"]
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          cover_note?: string
          created_at?: string
          cv_path?: string | null
          id?: string
          job_id: string
          match_score?: number | null
          source?: Database["public"]["Enums"]["application_source"]
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          cover_note?: string
          created_at?: string
          cv_path?: string | null
          id?: string
          job_id?: string
          match_score?: number | null
          source?: Database["public"]["Enums"]["application_source"]
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_connections: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          settings: Json
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          settings?: Json
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          settings?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_mcp_audit: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          args: Json
          created_at: string
          error_message: string | null
          id: string
          ok: boolean
          tool_name: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          args?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          ok?: boolean
          tool_name: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          args?: Json
          created_at?: string
          error_message?: string | null
          id?: string
          ok?: boolean
          tool_name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: Json
          created_at: string
          excerpt: string
          featured_image_url: string | null
          id: string
          published_at: string | null
          slug: string
          sources: Json
          status: Database["public"]["Enums"]["blog_post_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          excerpt?: string
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug: string
          sources?: Json
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          excerpt?: string
          featured_image_url?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          sources?: Json
          status?: Database["public"]["Enums"]["blog_post_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          auto_apply: boolean
          auto_apply_min_score: number
          cv_filename: string | null
          cv_path: string | null
          cv_text: string | null
          desired_min_salary: number | null
          headline: string
          location: string
          open_to_remote: boolean
          preferred_work_types: Database["public"]["Enums"]["work_type"][]
          skills: string[]
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          auto_apply?: boolean
          auto_apply_min_score?: number
          cv_filename?: string | null
          cv_path?: string | null
          cv_text?: string | null
          desired_min_salary?: number | null
          headline?: string
          location?: string
          open_to_remote?: boolean
          preferred_work_types?: Database["public"]["Enums"]["work_type"][]
          skills?: string[]
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          auto_apply?: boolean
          auto_apply_min_score?: number
          cv_filename?: string | null
          cv_path?: string | null
          cv_text?: string | null
          desired_min_salary?: number | null
          headline?: string
          location?: string
          open_to_remote?: boolean
          preferred_work_types?: Database["public"]["Enums"]["work_type"][]
          skills?: string[]
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_requests: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          decided_at: string | null
          id: string
          job_id: string | null
          message: string
          status: Database["public"]["Enums"]["chat_request_status"]
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          job_id?: string | null
          message?: string
          status?: Database["public"]["Enums"]["chat_request_status"]
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          job_id?: string | null
          message?: string
          status?: Database["public"]["Enums"]["chat_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          brand_color: string
          created_at: string
          description: string
          id: string
          location: string
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          tagline: string
          website: string | null
        }
        Insert: {
          brand_color?: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          tagline?: string
          website?: string | null
        }
        Update: {
          brand_color?: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          tagline?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          candidate_id: string
          chat_request_id: string
          company_id: string
          created_at: string
          id: string
          job_id: string | null
          last_message_at: string
        }
        Insert: {
          candidate_id: string
          chat_request_id: string
          company_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
        }
        Update: {
          candidate_id?: string
          chat_request_id?: string
          company_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_chat_request_id_fkey"
            columns: ["chat_request_id"]
            isOneToOne: true
            referencedRelation: "chat_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["job_event_type"]
          id: number
          job_id: string
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["job_event_type"]
          id?: never
          job_id: string
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["job_event_type"]
          id?: never
          job_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string
          currency: string
          description: string
          expires_at: string | null
          external_ref: string | null
          highlights: string[]
          id: string
          is_remote: boolean
          location: string
          published_at: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string
          skills: string[]
          slug: string
          source: string
          status: Database["public"]["Enums"]["job_status"]
          tier: Database["public"]["Enums"]["ad_tier"]
          title: string
          updated_at: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string
          expires_at?: string | null
          external_ref?: string | null
          highlights?: string[]
          id?: string
          is_remote?: boolean
          location?: string
          published_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string
          skills?: string[]
          slug: string
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          tier?: Database["public"]["Enums"]["ad_tier"]
          title: string
          updated_at?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string
          expires_at?: string | null
          external_ref?: string | null
          highlights?: string[]
          id?: string
          is_remote?: boolean
          location?: string
          published_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string
          skills?: string[]
          slug?: string
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          tier?: Database["public"]["Enums"]["ad_tier"]
          title?: string
          updated_at?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_path: string | null
          body: string
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          read_at: string | null
          sender_id: string
        }
        Insert: {
          audio_path?: string | null
          body?: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          read_at?: string | null
          sender_id: string
        }
        Update: {
          audio_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      purchases: {
        Row: {
          company_id: string
          created_at: string
          credits_remaining: number
          id: string
          product_code: string
          quantity: number
          status: string
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          company_id: string
          created_at?: string
          credits_remaining: number
          id?: string
          product_code: string
          quantity: number
          status?: string
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          company_id?: string
          created_at?: string
          credits_remaining?: number
          id?: string
          product_code?: string
          quantity?: number
          status?: string
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "ad_products"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      company_daily_events: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          day: string
          event_type: Database["public"]["Enums"]["job_event_type"]
          total: number
        }[]
      }
      company_job_stats: {
        Args: { p_company_id: string }
        Returns: {
          applies: number
          chats: number
          clicks: number
          job_id: string
          views: number
        }[]
      }
      expire_overdue_jobs: { Args: never; Returns: undefined }
      match_score: {
        Args: {
          p_candidate_location: string
          p_candidate_skills: string[]
          p_candidate_work_types: Database["public"]["Enums"]["work_type"][]
          p_job_is_remote: boolean
          p_job_location: string
          p_job_skills: string[]
          p_job_work_type: Database["public"]["Enums"]["work_type"]
          p_open_to_remote: boolean
        }
        Returns: number
      }
      matched_jobs_for_me: {
        Args: never
        Returns: {
          job_id: string
          score: number
        }[]
      }
    }
    Enums: {
      ad_tier: "basic" | "branded" | "premium"
      application_source: "manual" | "batch" | "auto"
      application_status:
        | "submitted"
        | "viewed"
        | "shortlisted"
        | "rejected"
        | "hired"
      blog_post_status: "draft" | "published" | "archived"
      chat_request_status: "pending" | "accepted" | "declined"
      job_event_type: "impression" | "view" | "click" | "apply" | "chat_request"
      job_status: "draft" | "active" | "expired" | "closed"
      message_kind: "text" | "voice" | "system"
      user_role: "candidate" | "employer"
      work_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "casual"
        | "internship"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_tier: ["basic", "branded", "premium"],
      application_source: ["manual", "batch", "auto"],
      application_status: [
        "submitted",
        "viewed",
        "shortlisted",
        "rejected",
        "hired",
      ],
      blog_post_status: ["draft", "published", "archived"],
      chat_request_status: ["pending", "accepted", "declined"],
      job_event_type: ["impression", "view", "click", "apply", "chat_request"],
      job_status: ["draft", "active", "expired", "closed"],
      message_kind: ["text", "voice", "system"],
      user_role: ["candidate", "employer"],
      work_type: ["full_time", "part_time", "contract", "casual", "internship"],
    },
  },
} as const
