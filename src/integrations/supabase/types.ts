export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          event_type: string;
          id: string;
          metadata: Json;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type: string;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event_type?: string;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
        };
        Relationships: [];
      };
      ai_rate_limits: {
        Row: {
          bucket: string;
          count: number;
          updated_at: string;
          user_id: string;
          window_start: string;
        };
        Insert: {
          bucket: string;
          count?: number;
          updated_at?: string;
          user_id: string;
          window_start?: string;
        };
        Update: {
          bucket?: string;
          count?: number;
          updated_at?: string;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      study_plans: {
        Row: {
          created_at: string;
          daily_minutes: number;
          exam_date: string;
          id: string;
          name: string;
          status: string;
          topics: string[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          daily_minutes?: number;
          exam_date: string;
          id?: string;
          name: string;
          status?: string;
          topics?: string[];
          user_id: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          exam_date?: string;
          id?: string;
          name?: string;
          status?: string;
          topics?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      study_plan_tasks: {
        Row: {
          completed_at: string | null;
          completion_type: string | null;
          created_at: string;
          date: string;
          id: string;
          kind: string;
          minutes: number;
          objective: string | null;
          order_index: number;
          plan_id: string;
          status: string;
          title: string;
          topic_name: string | null;
          topic_slug: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completion_type?: string | null;
          created_at?: string;
          date: string;
          id?: string;
          kind: string;
          minutes?: number;
          objective?: string | null;
          order_index?: number;
          plan_id: string;
          status?: string;
          title: string;
          topic_name?: string | null;
          topic_slug?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completion_type?: string | null;
          created_at?: string;
          date?: string;
          id?: string;
          kind?: string;
          minutes?: number;
          objective?: string | null;
          order_index?: number;
          plan_id?: string;
          status?: string;
          title?: string;
          topic_name?: string | null;
          topic_slug?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      srs_items: {
        Row: {
          box: number;
          created_at: string;
          due_at: string;
          exercise_id: string;
          id: string;
          reviews: number;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          box?: number;
          created_at?: string;
          due_at?: string;
          exercise_id: string;
          id?: string;
          reviews?: number;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          box?: number;
          created_at?: string;
          due_at?: string;
          exercise_id?: string;
          id?: string;
          reviews?: number;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          created_at: string;
          detected_topic: string | null;
          error_message: string | null;
          extracted_text: string | null;
          file_name: string;
          file_size: number | null;
          file_type: string;
          id: string;
          mime_type: string | null;
          page_count: number | null;
          preview: string | null;
          status: string;
          storage_path: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          detected_topic?: string | null;
          error_message?: string | null;
          extracted_text?: string | null;
          file_name: string;
          file_size?: number | null;
          file_type: string;
          id?: string;
          mime_type?: string | null;
          page_count?: number | null;
          preview?: string | null;
          status?: string;
          storage_path?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          detected_topic?: string | null;
          error_message?: string | null;
          extracted_text?: string | null;
          file_name?: string;
          file_size?: number | null;
          file_type?: string;
          id?: string;
          mime_type?: string | null;
          page_count?: number | null;
          preview?: string | null;
          status?: string;
          storage_path?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      feedback_reports: {
        Row: {
          created_at: string;
          difficulty: number | null;
          exercise_id: string | null;
          id: string;
          message: string;
          metadata: Json;
          status: string;
          topic: string | null;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          difficulty?: number | null;
          exercise_id?: string | null;
          id?: string;
          message: string;
          metadata?: Json;
          status?: string;
          topic?: string | null;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          difficulty?: number | null;
          exercise_id?: string | null;
          id?: string;
          message?: string;
          metadata?: Json;
          status?: string;
          topic?: string | null;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      ai_generation_log: {
        Row: {
          created_at: string;
          difficulty: number | null;
          error_message: string | null;
          generated_exercise: Json | null;
          id: string;
          model: string | null;
          status: string;
          topic_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          difficulty?: number | null;
          error_message?: string | null;
          generated_exercise?: Json | null;
          id?: string;
          model?: string | null;
          status?: string;
          topic_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          difficulty?: number | null;
          error_message?: string | null;
          generated_exercise?: Json | null;
          id?: string;
          model?: string | null;
          status?: string;
          topic_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generation_log_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_attempts: {
        Row: {
          created_at: string;
          difficulty: number | null;
          exercise_id: string | null;
          hint_used: boolean;
          id: string;
          is_correct: boolean;
          source: string;
          status: string | null;
          time_spent_sec: number | null;
          topic_id: string | null;
          user_answer: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty?: number | null;
          exercise_id?: string | null;
          hint_used?: boolean;
          id?: string;
          is_correct: boolean;
          source?: string;
          status?: string | null;
          time_spent_sec?: number | null;
          topic_id?: string | null;
          user_answer?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: number | null;
          exercise_id?: string | null;
          hint_used?: boolean;
          id?: string;
          is_correct?: boolean;
          source?: string;
          status?: string | null;
          time_spent_sec?: number | null;
          topic_id?: string | null;
          user_answer?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          ai_generated: boolean;
          approved: boolean;
          correct_answer: string;
          created_at: string;
          created_by: string | null;
          difficulty: number;
          explanation: string | null;
          hints: Json | null;
          id: string;
          level: string | null;
          options: Json | null;
          statement: string;
          tags: string[] | null;
          topic_id: string;
          type: Database["public"]["Enums"]["exercise_type"];
          validation_version: number;
        };
        Insert: {
          ai_generated?: boolean;
          approved?: boolean;
          correct_answer: string;
          created_at?: string;
          created_by?: string | null;
          difficulty?: number;
          explanation?: string | null;
          hints?: Json | null;
          id?: string;
          level?: string | null;
          options?: Json | null;
          statement: string;
          tags?: string[] | null;
          topic_id: string;
          type?: Database["public"]["Enums"]["exercise_type"];
          validation_version?: number;
        };
        Update: {
          ai_generated?: boolean;
          approved?: boolean;
          correct_answer?: string;
          created_at?: string;
          created_by?: string | null;
          difficulty?: number;
          explanation?: string | null;
          hints?: Json | null;
          id?: string;
          level?: string | null;
          options?: Json | null;
          statement?: string;
          tags?: string[] | null;
          topic_id?: string;
          type?: Database["public"]["Enums"]["exercise_type"];
          validation_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_streak: number;
          daily_goal: number;
          diagnostic_completed: boolean;
          full_name: string | null;
          id: string;
          last_activity_date: string | null;
          level: number;
          longest_streak: number;
          plan: string;
          updated_at: string;
          username: string | null;
          xp: number;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number;
          daily_goal?: number;
          diagnostic_completed?: boolean;
          full_name?: string | null;
          id: string;
          last_activity_date?: string | null;
          level?: number;
          longest_streak?: number;
          plan?: string;
          updated_at?: string;
          username?: string | null;
          xp?: number;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_streak?: number;
          daily_goal?: number;
          diagnostic_completed?: boolean;
          full_name?: string | null;
          id?: string;
          last_activity_date?: string | null;
          level?: number;
          longest_streak?: number;
          plan?: string;
          updated_at?: string;
          username?: string | null;
          xp?: number;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          order_index: number;
          slug: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          order_index?: number;
          slug: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
          slug?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          correct_count: number;
          current_difficulty: number;
          exercises_completed: number;
          id: string;
          mastery_pct: number;
          recent_results: Json;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          correct_count?: number;
          current_difficulty?: number;
          exercises_completed?: number;
          id?: string;
          mastery_pct?: number;
          recent_results?: Json;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          correct_count?: number;
          current_difficulty?: number;
          exercises_completed?: number;
          id?: string;
          mastery_pct?: number;
          recent_results?: Json;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
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
      [_ in never]: never;
    };
    Functions: {
      answer_adaptive_exercise: {
        Args: {
          p_exercise_id: string;
          p_hint_used?: boolean;
          p_user_answer: string;
        };
        Returns: {
          correct: boolean;
          xp_gain: number;
          new_difficulty: number;
          mastery_pct: number;
          leveled_up: boolean;
          new_level: number;
        }[];
      };
      answer_numeric_value: {
        Args: {
          p_raw: string;
        };
        Returns: number;
      };
      answer_text_basic: {
        Args: {
          p_raw: string;
        };
        Returns: string;
      };
      answers_equal: {
        Args: {
          p_correct_answer: string;
          p_type: Database["public"]["Enums"]["exercise_type"];
          p_user_answer: string;
        };
        Returns: boolean;
      };
      auto_complete_study_task: {
        Args: {
          p_task_id: string;
        };
        Returns: {
          completed: boolean;
          xp_gain: number;
          new_level: number | null;
          leveled_up: boolean;
        }[];
      };
      check_ai_rate_limit: {
        Args: {
          p_bucket: string;
          p_limit: number;
          p_window_seconds?: number;
        };
        Returns: {
          ok: boolean;
          retry_in_sec: number | null;
          remaining: number | null;
        }[];
      };
      complete_study_task_manually: {
        Args: {
          p_task_id: string;
        };
        Returns: {
          completed: boolean;
          xp_gain: number;
          new_level: number | null;
          leveled_up: boolean;
        }[];
      };
      create_material_record: {
        Args: {
          p_file_name: string;
          p_file_size?: number | null;
          p_file_type: string;
          p_mime_type?: string | null;
        };
        Returns: string;
      };
      delete_material_record: {
        Args: {
          p_material_id: string;
        };
        Returns: {
          deleted: boolean;
          storage_path: string | null;
        }[];
      };
      finalize_material_record: {
        Args: {
          p_detected_topic?: string | null;
          p_extracted_text?: string | null;
          p_material_id: string;
          p_page_count?: number | null;
          p_preview?: string | null;
          p_storage_path?: string | null;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      mark_material_error: {
        Args: {
          p_error_message: string;
          p_material_id: string;
        };
        Returns: boolean;
      };
      replan_study_tasks: {
        Args: {
          p_plan_id: string;
        };
        Returns: {
          updated: number;
        }[];
      };
      submit_feedback_report: {
        Args: {
          p_difficulty?: number | null;
          p_exercise_id?: string | null;
          p_message: string;
          p_metadata?: Json;
          p_topic?: string | null;
          p_type: string;
        };
        Returns: string;
      };
      track_analytics_event: {
        Args: {
          p_entity_id?: string | null;
          p_entity_type?: string | null;
          p_event_type: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      submit_diagnostic_results: {
        Args: {
          p_results: Json;
        };
        Returns: {
          updated_count: number;
        }[];
      };
      study_task_target: {
        Args: {
          p_kind: string;
        };
        Returns: number;
      };
      update_daily_goal: {
        Args: {
          p_daily_goal: number;
        };
        Returns: number;
      };
      update_feedback_report_status: {
        Args: {
          p_report_id: string;
          p_status: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "student" | "teacher" | "admin";
      exercise_type: "multiple_choice" | "open" | "true_false";
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
      app_role: ["student", "teacher", "admin"],
      exercise_type: ["multiple_choice", "open", "true_false"],
    },
  },
} as const;
