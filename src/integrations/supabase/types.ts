export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      class_schedules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          meeting_link: string | null
          start_time: string
          subject_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          meeting_link?: string | null
          start_time: string
          subject_id: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          meeting_link?: string | null
          start_time?: string
          subject_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          due_date: string
          id: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          due_date: string
          id?: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          due_date?: string
          id?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_reminders: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          is_active: boolean | null
          max_reminders: number | null
          next_reminder_at: string | null
          reminder_count: number | null
          reminder_interval: unknown | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          is_active?: boolean | null
          max_reminders?: number | null
          next_reminder_at?: string | null
          reminder_count?: number | null
          reminder_interval?: unknown | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          is_active?: boolean | null
          max_reminders?: number | null
          next_reminder_at?: string | null
          reminder_count?: number | null
          reminder_interval?: unknown | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_reminders_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          created_at: string
          enrolled_at: string | null
          id: string
          payment_amount: number | null
          payment_currency: string | null
          payment_due_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_filename: string | null
          payment_proof_uploaded_at: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          rejected_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          subject_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_due_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_filename?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          subject_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          payment_amount?: number | null
          payment_currency?: string | null
          payment_due_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_proof_filename?: string | null
          payment_proof_uploaded_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          subject_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "lesson_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          duration_minutes: number | null
          grade: number | null
          id: string
          lesson_type: string
          order: number
          pass_mark: number | null
          tenant_id: string
          time_limit: number | null
          title: string
          topic_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          grade?: number | null
          id?: string
          lesson_type: string
          order?: number
          pass_mark?: number | null
          tenant_id: string
          time_limit?: number | null
          title: string
          topic_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          grade?: number | null
          id?: string
          lesson_type?: string
          order?: number
          pass_mark?: number | null
          tenant_id?: string
          time_limit?: number | null
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_active: boolean | null
          subject_template: string | null
          template_name: string
          template_type: string
          tenant_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          subject_template?: string | null
          template_name: string
          template_type: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          subject_template?: string | null
          template_name?: string
          template_type?: string
          tenant_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_method: string
          enrollment_id: string | null
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          opened_at: string | null
          recipient_address: string
          sent_at: string | null
          status: string | null
          subject: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_method: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          opened_at?: string | null
          recipient_address: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          enrollment_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          opened_at?: string | null
          recipient_address?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          grade?: number | null
          id: string
          tenant_id: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          grade?: number | null
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          passed: boolean
          score: number
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          passed: boolean
          score: number
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          passed?: boolean
          score?: number
          tenant_id?: string
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
          {
            foreignKeyName: "quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          activity: string
          course: string
          date?: string
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          activity?: string
          course?: string
          date?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recent_activity_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          id: string
          progress: number
          subject_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          progress: number
          subject_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          progress?: number
          subject_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "student_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
          timeframe?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_categories: {
        Row: {
          category: Database["public"]["Enums"]["subject_category"]
          created_at: string
          id: string
          subject_id: string
          tenant_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["subject_category"]
          created_at?: string
          id?: string
          subject_id: string
          tenant_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["subject_category"]
          created_at?: string
          id?: string
          subject_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_categories_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: Database["public"]["Enums"]["subject_category"]
          class_time: string | null
          created_at: string
          id: string
          name: string
          teams_link: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["subject_category"]
          class_time?: string | null
          created_at?: string
          id?: string
          name: string
          teams_link?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["subject_category"]
          class_time?: string | null
          created_at?: string
          id?: string
          name?: string
          teams_link?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          id: string
          name: string
          subject_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          name: string
          subject_id: string
          tenant_id: string
        }
        Update: {
          id?: string
          name?: string
          subject_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_notes: {
        Row: {
          created_at: string
          id: string
          prompt: string
          response: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          response: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          response?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subjects: {
        Row: {
          id: string
          subject_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "user_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_super_admin_role: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      create_tenant: {
        Args: {
          tenant_name: string
          tenant_domain: string
          admin_email: string
          admin_password: string
          admin_full_name: string
        }
        Returns: {
          tenant_id: string
          admin_user_id: string
        }[]
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_users_count: number
          new_users_last_30_days: number
          total_subjects_count: number
          total_lessons_count: number
          total_resources_count: number
          total_lessons_completed: number
          total_quizzes_attempted: number
          most_popular_subjects: Json
        }[]
      }
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
          tenant_name: string
        }[]
      }
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_quiz_lessons_by_subject: {
        Args: { p_subject_id: string }
        Returns: {
          id: string
          title: string
        }[]
      }
      get_super_admin_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_tenants_count: number
          total_users_across_all_tenants: number
          total_active_users_last_30_days: number
          tenants_with_stats: Json
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
          tenant_name: string
        }[]
      }
      get_user_learning_stats: {
        Args: { p_user_id: string }
        Returns: {
          lessons_completed: number
          total_study_hours: number
          active_subjects: number
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
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tenant_admin: {
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
      app_role:
        | "admin"
        | "learner"
        | "tutor"
        | "parent"
        | "super_admin"
        | "student"
      enrollment_status:
        | "pending_payment"
        | "payment_submitted"
        | "payment_approved"
        | "payment_rejected"
        | "enrollment_active"
        | "enrollment_suspended"
      payment_method:
        | "bank_transfer"
        | "credit_card"
        | "paypal"
        | "cryptocurrency"
        | "cash"
        | "other"
      subject_category: "matric_amended" | "national_senior" | "senior_phase"
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
      app_role: [
        "admin",
        "learner",
        "tutor",
        "parent",
        "super_admin",
        "student",
      ],
      enrollment_status: [
        "pending_payment",
        "payment_submitted",
        "payment_approved",
        "payment_rejected",
        "enrollment_active",
        "enrollment_suspended",
      ],
      payment_method: [
        "bank_transfer",
        "credit_card",
        "paypal",
        "cryptocurrency",
        "cash",
        "other",
      ],
      subject_category: ["matric_amended", "national_senior", "senior_phase"],
    },
  },
} as const
