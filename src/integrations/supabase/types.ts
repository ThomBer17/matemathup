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
      ai_generation_log: {
        Row: {
          created_at: string
          difficulty: number | null
          error_message: string | null
          generated_exercise: Json | null
          id: string
          model: string | null
          status: string
          topic_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          error_message?: string | null
          generated_exercise?: Json | null
          id?: string
          model?: string | null
          status?: string
          topic_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          error_message?: string | null
          generated_exercise?: Json | null
          id?: string
          model?: string | null
          status?: string
          topic_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_log_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_attempts: {
        Row: {
          created_at: string
          difficulty: number | null
          exercise_id: string | null
          hint_used: boolean
          id: string
          is_correct: boolean
          source: string
          status: string | null
          time_spent_sec: number | null
          topic_id: string | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number | null
          exercise_id?: string | null
          hint_used?: boolean
          id?: string
          is_correct: boolean
          source?: string
          status?: string | null
          time_spent_sec?: number | null
          topic_id?: string | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number | null
          exercise_id?: string | null
          hint_used?: boolean
          id?: string
          is_correct?: boolean
          source?: string
          status?: string | null
          time_spent_sec?: number | null
          topic_id?: string | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          ai_generated: boolean
          approved: boolean
          correct_answer: string
          created_at: string
          created_by: string | null
          difficulty: number
          explanation: string | null
          hints: Json | null
          id: string
          level: string | null
          options: Json | null
          statement: string
          tags: string[] | null
          topic_id: string
          type: Database["public"]["Enums"]["exercise_type"]
        }
        Insert: {
          ai_generated?: boolean
          approved?: boolean
          correct_answer: string
          created_at?: string
          created_by?: string | null
          difficulty?: number
          explanation?: string | null
          hints?: Json | null
          id?: string
          level?: string | null
          options?: Json | null
          statement: string
          tags?: string[] | null
          topic_id: string
          type?: Database["public"]["Enums"]["exercise_type"]
        }
        Update: {
          ai_generated?: boolean
          approved?: boolean
          correct_answer?: string
          created_at?: string
          created_by?: string | null
          difficulty?: number
          explanation?: string | null
          hints?: Json | null
          id?: string
          level?: string | null
          options?: Json | null
          statement?: string
          tags?: string[] | null
          topic_id?: string
          type?: Database["public"]["Enums"]["exercise_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exercises_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          full_name: string | null
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          plan: string
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          full_name?: string | null
          id: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          plan?: string
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          full_name?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          plan?: string
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      topics: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          slug?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          correct_count: number
          current_difficulty: number
          exercises_completed: number
          id: string
          mastery_pct: number
          recent_results: Json
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_count?: number
          current_difficulty?: number
          exercises_completed?: number
          id?: string
          mastery_pct?: number
          recent_results?: Json
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_count?: number
          current_difficulty?: number
          exercises_completed?: number
          id?: string
          mastery_pct?: number
          recent_results?: Json
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin"
      exercise_type: "multiple_choice" | "open" | "true_false"
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
      app_role: ["student", "teacher", "admin"],
      exercise_type: ["multiple_choice", "open", "true_false"],
    },
  },
} as const
