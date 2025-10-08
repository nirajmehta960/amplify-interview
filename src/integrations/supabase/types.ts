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
          question_id: string;
          response_text: string | null;
          response_audio_url: string | null;
          response_video_url: string | null;
          duration: number | null;
          score: number | null;
          ai_feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          response_text?: string | null;
          response_audio_url?: string | null;
          response_video_url?: string | null;
          duration?: number | null;
          score?: number | null;
          ai_feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          response_text?: string | null;
          response_audio_url?: string | null;
          response_video_url?: string | null;
          duration?: number | null;
          score?: number | null;
          ai_feedback?: string | null;
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
            referencedColumns: ["id"];
          }
        ];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          interview_type: string;
          score: number | null;
          duration: number;
          created_at: string;
          interview_config: Json | null;
          questions_asked: Json | null;
          notes: string | null;
          recording_url: string | null;
          ai_feedback: Json | null;
          overall_score: number | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          interview_type: string;
          score?: number | null;
          duration: number;
          created_at?: string;
          interview_config?: Json | null;
          questions_asked?: Json | null;
          notes?: string | null;
          recording_url?: string | null;
          ai_feedback?: Json | null;
          overall_score?: number | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          interview_type?: string;
          score?: number | null;
          duration?: number;
          created_at?: string;
          interview_config?: Json | null;
          questions_asked?: Json | null;
          notes?: string | null;
          recording_url?: string | null;
          ai_feedback?: Json | null;
          overall_score?: number | null;
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
