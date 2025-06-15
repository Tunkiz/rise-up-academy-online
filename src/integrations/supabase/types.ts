export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      deadlines: {
        Row: {
          due_date: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          due_date: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          due_date?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          description: string | null
          exam_date: string
          id: string
          name: string
          registration_end_date: string
          registration_start_date: string
        }
        Insert: {
          description?: string | null
          exam_date: string
          id?: string
          name: string
          registration_end_date: string
          registration_start_date: string
        }
        Update: {
          description?: string | null
          exam_date?: string
          id?: string
          name?: string
          registration_end_date?: string
          registration_start_date?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachment_url: string | null
          content: string | null
          description: string | null
          due_date: string | null
          grade: number | null
          id: string
          lesson_type: string
          order: number
          pass_mark: number | null
          time_limit: number | null
          title: string
          topic_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          description?: string | null
          due_date?: string | null
          grade?: number | null
          id?: string
          lesson_type: string
          order?: number
          pass_mark?: number | null
          time_limit?: number | null
          title: string
          topic_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          description?: string | null
          due_date?: string | null
          grade?: number | null
          id?: string
          lesson_type?: string
          order?: number
          pass_mark?: number | null
          time_limit?: number | null
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
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
          full_name: string | null
          grade: number | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          grade?: number | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          grade?: number | null
          id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          explanation: string | null
          id: string
          lesson_id: string
          order: number
          question_text: string
        }
        Insert: {
          explanation?: string | null
          id?: string
          lesson_id: string
          order?: number
          question_text: string
        }
        Update: {
          explanation?: string | null
          id?: string
          lesson_id?: string
          order?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_activity: {
        Row: {
          activity: string
          course: string
          date: string
          id: string
          user_id: string | null
        }
        Insert: {
          activity: string
          course: string
          date?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          activity?: string
          course?: string
          date?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_url: string | null
          grade: number | null
          id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          subject_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          id: string
          progress: number
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          progress: number
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          progress?: number
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          goal: string
          hours_per_week: number
          id: string
          plan_content: string
          timeframe: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal: string
          hours_per_week: number
          id?: string
          plan_content: string
          timeframe: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string
          hours_per_week?: number
          id?: string
          plan_content?: string
          timeframe?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          class_time: string | null
          id: string
          name: string
          teams_link: string | null
        }
        Insert: {
          class_time?: string | null
          id?: string
          name: string
          teams_link?: string | null
        }
        Update: {
          class_time?: string | null
          id?: string
          name?: string
          teams_link?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          name: string
          subject_id: string
        }
        Insert: {
          id?: string
          name: string
          subject_id: string
        }
        Update: {
          id?: string
          name?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          full_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
          banned_until: string
          avatar_url: string
          grade: number
          subjects: Json
        }[]
      }
      get_quiz_lessons_by_subject: {
        Args: { p_subject_id: string }
        Returns: {
          id: string
          title: string
        }[]
      }
      get_user_activity: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          activity: string
          course: string
          date: string
        }[]
      }
      get_user_details: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          full_name: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
          banned_until: string
          avatar_url: string
          grade: number
          subjects: Json
        }[]
      }
      get_user_lesson_deadlines: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          title: string
          due_date: string
          lesson_type: string
          subject_name: string
          topic_id: string
          subject_id: string
        }[]
      }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          lessons_completed_count: number
          quizzes_attempted_count: number
          average_quiz_score: number
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      manage_user_suspension: {
        Args: { target_user_id: string; action: string }
        Returns: undefined
      }
      update_user_details_by_admin: {
        Args: {
          target_user_id: string
          new_full_name: string
          new_grade: number
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          target_user_id: string
          new_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      update_user_subjects_by_admin: {
        Args: { target_user_id: string; new_subject_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "learner" | "tutor" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "learner", "tutor", "parent"],
    },
  },
} as const
