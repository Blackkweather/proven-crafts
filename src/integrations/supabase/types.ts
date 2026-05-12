export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          challenge_submission_id: string | null;
          created_at: string;
          id: string;
          job_id: string;
          match_score: number;
          message: string | null;
          status: string;
          talent_id: string;
          updated_at: string;
        };
        Insert: {
          challenge_submission_id?: string | null;
          created_at?: string;
          id?: string;
          job_id: string;
          match_score?: number;
          message?: string | null;
          status?: string;
          talent_id: string;
          updated_at?: string;
        };
        Update: {
          challenge_submission_id?: string | null;
          created_at?: string;
          id?: string;
          job_id?: string;
          match_score?: number;
          message?: string | null;
          status?: string;
          talent_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_challenge_submission_id_fkey";
            columns: ["challenge_submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_notes: {
        Row: {
          application_id: string;
          author_id: string;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
        };
        Insert: {
          application_id: string;
          author_id: string;
          author_name: string;
          body: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          application_id?: string;
          author_id?: string;
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_notes_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      candidate_votes: {
        Row: {
          application_id: string;
          created_at: string;
          id: string;
          updated_at: string;
          vote: string;
          voter_id: string;
          voter_name: string;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          vote: string;
          voter_id: string;
          voter_name: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          id?: string;
          updated_at?: string;
          vote?: string;
          voter_id?: string;
          voter_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidate_votes_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_votes_voter_id_fkey";
            columns: ["voter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidate_votes_voter_id_fkey";
            columns: ["voter_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          brief: string;
          company_id: string;
          created_at: string;
          deadline_at: string;
          id: string;
          prize: string | null;
          required_skills: string[];
          status: string;
          submissions_count: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          brief?: string;
          company_id: string;
          created_at?: string;
          deadline_at?: string;
          id?: string;
          prize?: string | null;
          required_skills?: string[];
          status?: string;
          submissions_count?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          brief?: string;
          company_id?: string;
          created_at?: string;
          deadline_at?: string;
          id?: string;
          prize?: string | null;
          required_skills?: string[];
          status?: string;
          submissions_count?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenges_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      company_hiring_steps: {
        Row: {
          company_id: string;
          description: string;
          duration: string;
          id: string;
          label: string;
          paid: boolean;
          step_order: number;
        };
        Insert: {
          company_id: string;
          description?: string;
          duration?: string;
          id?: string;
          label: string;
          paid?: boolean;
          step_order: number;
        };
        Update: {
          company_id?: string;
          description?: string;
          duration?: string;
          id?: string;
          label?: string;
          paid?: boolean;
          step_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "company_hiring_steps_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_hiring_steps_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          company: string | null;
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          topic: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          topic: string;
        };
        Update: {
          company?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          topic?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string | null;
          participant_a: string;
          participant_b: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          participant_a: string;
          participant_b: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          participant_a?: string;
          participant_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_participant_a_fkey";
            columns: ["participant_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_a_fkey";
            columns: ["participant_a"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_b_fkey";
            columns: ["participant_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_participant_b_fkey";
            columns: ["participant_b"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          applicants: number;
          arrangement: string;
          comp: string;
          company_id: string;
          created_at: string;
          id: string;
          location: string;
          required_skills: string[];
          status: string;
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          applicants?: number;
          arrangement?: string;
          comp?: string;
          company_id: string;
          created_at?: string;
          id?: string;
          location?: string;
          required_skills?: string[];
          status?: string;
          summary?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          applicants?: number;
          arrangement?: string;
          comp?: string;
          company_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          required_skills?: string[];
          status?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_entries: {
        Row: {
          badge: string | null;
          challenge_id: string;
          created_at: string;
          highlight: string;
          id: string;
          rank: number;
          score: number;
          talent_id: string;
        };
        Insert: {
          badge?: string | null;
          challenge_id: string;
          created_at?: string;
          highlight?: string;
          id?: string;
          rank: number;
          score: number;
          talent_id: string;
        };
        Update: {
          badge?: string | null;
          challenge_id?: string;
          created_at?: string;
          highlight?: string;
          id?: string;
          rank?: number;
          score?: number;
          talent_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      market_rates: {
        Row: {
          currency: string;
          delta: number;
          id: string;
          location: string;
          median: number;
          p25: number;
          p75: number;
          skill: string;
          trend: string;
          updated_at: string;
        };
        Insert: {
          currency?: string;
          delta?: number;
          id?: string;
          location: string;
          median: number;
          p25: number;
          p75: number;
          skill: string;
          trend?: string;
          updated_at?: string;
        };
        Update: {
          currency?: string;
          delta?: number;
          id?: string;
          location?: string;
          median?: number;
          p25?: number;
          p75?: number;
          skill?: string;
          trend?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          status: string;
          talent_id: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          status?: string;
          talent_id: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          status?: string;
          talent_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_items: {
        Row: {
          cover_url: string | null;
          created_at: string;
          id: string;
          pinned: boolean;
          profile_id: string;
          summary: string;
          tags: string[];
          title: string;
          type: string;
          url: string | null;
          year: number;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          profile_id: string;
          summary?: string;
          tags?: string[];
          title: string;
          type: string;
          url?: string | null;
          year: number;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          profile_id?: string;
          summary?: string;
          tags?: string[];
          title?: string;
          type?: string;
          url?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_views: {
        Row: {
          id: string;
          profile_id: string;
          viewed_at: string;
          viewer_id: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          viewed_at?: string;
          viewer_id?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          viewed_at?: string;
          viewer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_views_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"];
          allow_messages: string;
          anti_ghosting_badge: boolean;
          availability: string;
          avatar_url: string | null;
          bio: string;
          blind_mode: boolean;
          challenge_wins: number;
          company_about: string | null;
          company_industry: string | null;
          company_initials: string | null;
          company_name: string | null;
          company_size: string | null;
          completeness_pct: number;
          created_at: string;
          display_name: string;
          ghosting_rate: number | null;
          headline: string;
          id: string;
          location: string;
          notif_application_update: boolean;
          notif_challenge_result: boolean;
          notif_marketing: boolean;
          notif_message: boolean;
          notif_new_match: boolean;
          notif_weekly_digest: boolean;
          offer_rate: number | null;
          onboarding_completed_at: string | null;
          phone_number: string | null;
          profile_visibility: string;
          response_time_days: number | null;
          show_location: boolean;
          social_handle: string | null;
          total_hires: number | null;
          trust_score: number | null;
          updated_at: string;
          video_intro_path: string | null;
          video_intro_url: string | null;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"];
          allow_messages?: string;
          anti_ghosting_badge?: boolean;
          availability?: string;
          avatar_url?: string | null;
          bio?: string;
          blind_mode?: boolean;
          challenge_wins?: number;
          company_about?: string | null;
          company_industry?: string | null;
          company_initials?: string | null;
          company_name?: string | null;
          company_size?: string | null;
          completeness_pct?: number;
          created_at?: string;
          display_name?: string;
          ghosting_rate?: number | null;
          headline?: string;
          id: string;
          location?: string;
          notif_application_update?: boolean;
          notif_challenge_result?: boolean;
          notif_marketing?: boolean;
          notif_message?: boolean;
          notif_new_match?: boolean;
          notif_weekly_digest?: boolean;
          offer_rate?: number | null;
          onboarding_completed_at?: string | null;
          phone_number?: string | null;
          profile_visibility?: string;
          response_time_days?: number | null;
          show_location?: boolean;
          social_handle?: string | null;
          total_hires?: number | null;
          trust_score?: number | null;
          updated_at?: string;
          video_intro_path?: string | null;
          video_intro_url?: string | null;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"];
          allow_messages?: string;
          anti_ghosting_badge?: boolean;
          availability?: string;
          avatar_url?: string | null;
          bio?: string | null;
          blind_mode?: boolean;
          challenge_wins?: number;
          company_about?: string | null;
          company_industry?: string | null;
          company_initials?: string | null;
          company_name?: string | null;
          company_size?: string | null;
          completeness_pct?: number;
          created_at?: string;
          display_name?: string | null;
          ghosting_rate?: number | null;
          headline?: string | null;
          id?: string;
          location?: string | null;
          notif_application_update?: boolean;
          notif_challenge_result?: boolean;
          notif_marketing?: boolean;
          notif_message?: boolean;
          notif_new_match?: boolean;
          notif_weekly_digest?: boolean;
          offer_rate?: number | null;
          onboarding_completed_at?: string | null;
          phone_number?: string | null;
          profile_visibility?: string;
          response_time_days?: number | null;
          show_location?: boolean;
          social_handle?: string | null;
          total_hires?: number | null;
          trust_score?: number | null;
          updated_at?: string;
          video_intro_path?: string | null;
          video_intro_url?: string | null;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          created_at: string;
          id: string;
          level: string;
          name: string;
          profile_id: string;
          verified_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level: string;
          name: string;
          profile_id: string;
          verified_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          level?: string;
          name?: string;
          profile_id?: string;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "skills_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skills_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          challenge_id: string;
          created_at: string;
          file_urls: string[];
          id: string;
          match_score: number;
          status: string;
          talent_id: string;
          updated_at: string;
          work_url: string | null;
          writeup: string | null;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          file_urls?: string[];
          id?: string;
          match_score?: number;
          status?: string;
          talent_id: string;
          updated_at?: string;
          work_url?: string | null;
          writeup?: string | null;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          file_urls?: string[];
          id?: string;
          match_score?: number;
          status?: string;
          talent_id?: string;
          updated_at?: string;
          work_url?: string | null;
          writeup?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      talent_shortlists: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          talent_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          talent_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          talent_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "talent_shortlists_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "talent_shortlists_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "talent_shortlists_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "talent_shortlists_talent_id_fkey";
            columns: ["talent_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null;
          anti_ghosting_badge: boolean | null;
          availability: string | null;
          avatar_url: string | null;
          bio: string | null;
          challenge_wins: number | null;
          company_about: string | null;
          company_industry: string | null;
          company_initials: string | null;
          company_name: string | null;
          company_size: string | null;
          completeness_pct: number | null;
          created_at: string | null;
          display_name: string | null;
          ghosting_rate: number | null;
          headline: string | null;
          id: string | null;
          location: string | null;
          offer_rate: number | null;
          response_time_days: number | null;
          total_hires: number | null;
          trust_score: number | null;
          updated_at: string | null;
          video_intro_url: string | null;
        };
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          anti_ghosting_badge?: boolean | null;
          availability?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          challenge_wins?: number | null;
          company_about?: string | null;
          company_industry?: string | null;
          company_initials?: string | null;
          company_name?: string | null;
          company_size?: string | null;
          completeness_pct?: number | null;
          created_at?: string | null;
          display_name?: string | null;
          ghosting_rate?: number | null;
          headline?: string | null;
          id?: string | null;
          location?: string | null;
          offer_rate?: number | null;
          response_time_days?: number | null;
          total_hires?: number | null;
          trust_score?: number | null;
          updated_at?: string | null;
          video_intro_url?: string | null;
        };
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"] | null;
          anti_ghosting_badge?: boolean | null;
          availability?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          challenge_wins?: number | null;
          company_about?: string | null;
          company_industry?: string | null;
          company_initials?: string | null;
          company_name?: string | null;
          company_size?: string | null;
          completeness_pct?: number | null;
          created_at?: string | null;
          display_name?: string | null;
          ghosting_rate?: number | null;
          headline?: string | null;
          id?: string | null;
          location?: string | null;
          offer_rate?: number | null;
          response_time_days?: number | null;
          total_hires?: number | null;
          trust_score?: number | null;
          updated_at?: string | null;
          video_intro_url?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      delete_own_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_contact_info: {
        Args: { subject_id: string };
        Returns: {
          phone_number: string;
          social_handle: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      account_type: "talent" | "company";
      app_role: "talent" | "company" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      account_type: ["talent", "company"],
      app_role: ["talent", "company", "admin"],
    },
  },
} as const;
