export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      interview_questions: {
        Row: {
          question_id: number;
          interview_type: "behavioral" | "technical" | "leadership" | "custom";
          custom_domain:
            | "product_manager"
            | "software_engineer"
            | "data_scientist"
            | "ui_ux_designer"
            | "devops_engineer"
            | "ai_engineer"
            | null;
          question_text: string;
          category: string | null;
          focus_areas: string[] | null;
          difficulty: "Easy" | "Medium" | "Hard";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          question_id?: number;
          interview_type: "behavioral" | "technical" | "leadership" | "custom";
          custom_domain?:
            | "product_manager"
            | "software_engineer"
            | "data_scientist"
            | "ui_ux_designer"
            | "devops_engineer"
            | "ai_engineer"
            | null;
          question_text: string;
          category?: string | null;
          focus_areas?: string[] | null;
          difficulty: "Easy" | "Medium" | "Hard";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          question_id?: number;
          interview_type?: "behavioral" | "technical" | "leadership" | "custom";
          custom_domain?:
            | "product_manager"
            | "software_engineer"
            | "data_scientist"
            | "ui_ux_designer"
            | "devops_engineer"
            | "ai_engineer"
            | null;
          question_text?: string;
          category?: string | null;
          focus_areas?: string[] | null;
          difficulty?: "Easy" | "Medium" | "Hard";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_responses: {
        Row: {
          id: string;
          session_id: string;
          question_id: number;
          response_text: string | null;
          duration: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: number;
          response_text?: string | null;
          duration?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: number;
          response_text?: string | null;
          duration?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_responses_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "interview_questions";
            referencedColumns: ["question_id"];
          }
        ];
      };
      interview_analysis: {
        Row: {
          id: string;
          interview_response_id: string;
          session_id: string;
          question_id: number;
          user_id: string;
          interview_type: string;
          custom_domain: string | null;
          model_used: string;
          overall_score: number | null;
          communication_scores: Json | null;
          content_scores: Json | null;
          strengths: Json | null;
          improvements: Json | null;
          actionable_feedback: string | null;
          improved_example: string | null;
          filler_words: Json | null;
          speaking_pace: number | null;
          confidence_score: number | null;
          tokens_used: number | null;
          input_tokens: number | null;
          output_tokens: number | null;
          cost_cents: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          interview_response_id: string;
          session_id: string;
          question_id: number;
          user_id: string;
          interview_type: string;
          custom_domain?: string | null;
          model_used: string;
          overall_score?: number | null;
          communication_scores?: Json | null;
          content_scores?: Json | null;
          strengths?: Json | null;
          improvements?: Json | null;
          actionable_feedback?: string | null;
          improved_example?: string | null;
          filler_words?: Json | null;
          speaking_pace?: number | null;
          confidence_score?: number | null;
          tokens_used?: number | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_cents?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          interview_response_id?: string;
          session_id?: string;
          question_id?: number;
          user_id?: string;
          interview_type?: string;
          custom_domain?: string | null;
          model_used?: string;
          overall_score?: number | null;
          communication_scores?: Json | null;
          content_scores?: Json | null;
          strengths?: Json | null;
          improvements?: Json | null;
          actionable_feedback?: string | null;
          improved_example?: string | null;
          filler_words?: Json | null;
          speaking_pace?: number | null;
          confidence_score?: number | null;
          tokens_used?: number | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_cents?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_analysis_interview_response_id_fkey";
            columns: ["interview_response_id"];
            isOneToOne: false;
            referencedRelation: "interview_responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_analysis_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_analysis_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "interview_questions";
            referencedColumns: ["question_id"];
          },
          {
            foreignKeyName: "interview_analysis_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_summary: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          total_questions: number;
          questions_answered: number;
          average_score: number | null;
          median_score: number | null;
          score_distribution: Json | null;
          performance_trend: string | null;
          model_breakdown: Json | null;
          total_tokens: number | null;
          total_input_tokens: number | null;
          total_output_tokens: number | null;
          total_cost_cents: number | null;
          overall_strengths: Json | null;
          overall_improvements: Json | null;
          readiness_level: string;
          readiness_score: number | null;
          role_specific_feedback: string | null;
          next_steps: Json | null;
          estimated_practice_time: string | null;
          total_duration_seconds: number | null;
          average_time_per_question: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          total_questions: number;
          questions_answered: number;
          average_score?: number | null;
          median_score?: number | null;
          score_distribution?: Json | null;
          performance_trend?: string | null;
          model_breakdown?: Json | null;
          total_tokens?: number | null;
          total_input_tokens?: number | null;
          total_output_tokens?: number | null;
          total_cost_cents?: number | null;
          overall_strengths?: Json | null;
          overall_improvements?: Json | null;
          readiness_level: string;
          readiness_score?: number | null;
          role_specific_feedback?: string | null;
          next_steps?: Json | null;
          estimated_practice_time?: string | null;
          total_duration_seconds?: number | null;
          average_time_per_question?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          total_questions?: number;
          questions_answered?: number;
          average_score?: number | null;
          median_score?: number | null;
          score_distribution?: Json | null;
          performance_trend?: string | null;
          model_breakdown?: Json | null;
          total_tokens?: number | null;
          total_input_tokens?: number | null;
          total_output_tokens?: number | null;
          total_cost_cents?: number | null;
          overall_strengths?: Json | null;
          overall_improvements?: Json | null;
          readiness_level?: string;
          readiness_score?: number | null;
          role_specific_feedback?: string | null;
          next_steps?: Json | null;
          estimated_practice_time?: string | null;
          total_duration_seconds?: number | null;
          average_time_per_question?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_summary_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "interview_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_summary_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_questions: {
        Row: {
          id: string;
          user_id: string;
          question_text: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_text: string;
          category?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_text?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_questions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          interview_type: string;
          session_score: number | null;
          duration: number;
          created_at: string;
          interview_config: Json | null;
          questions_asked: Json | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          interview_type: string;
          session_score?: number | null;
          duration: number;
          created_at?: string;
          interview_config?: Json | null;
          questions_asked?: Json | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          interview_type?: string;
          session_score?: number | null;
          duration?: number;
          created_at?: string;
          interview_config?: Json | null;
          questions_asked?: Json | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interview_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
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
    : never = never
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
    : never = never
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
