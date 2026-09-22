export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_i18n: {
        Row: {
          card_id: string
          feeling: string
          image_alt: string | null
          locale: string
        }
        Insert: {
          card_id: string
          feeling: string
          image_alt?: string | null
          locale: string
        }
        Update: {
          card_id?: string
          feeling?: string
          image_alt?: string | null
          locale?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_i18n_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          code: string
          id: string
          image_url: string | null
          sort: number
        }
        Insert: {
          code: string
          id: string
          image_url?: string | null
          sort: number
        }
        Update: {
          code?: string
          id?: string
          image_url?: string | null
          sort?: number
        }
        Relationships: []
      }
      exercise_i18n: {
        Row: {
          description: string
          exercise_id: string
          image_alt: string
          intro_text: string[] | null
          listen_text: string[] | null
          locale: string
          name: string
          needs: string | null
          question: string | null
          reflect_text: string[] | null
          scan_text: string[] | null
        }
        Insert: {
          description: string
          exercise_id: string
          image_alt: string
          intro_text?: string[] | null
          listen_text?: string[] | null
          locale: string
          name: string
          needs?: string | null
          question?: string | null
          reflect_text?: string[] | null
          scan_text?: string[] | null
        }
        Update: {
          description?: string
          exercise_id?: string
          image_alt?: string
          intro_text?: string[] | null
          listen_text?: string[] | null
          locale?: string
          name?: string
          needs?: string | null
          question?: string | null
          reflect_text?: string[] | null
          scan_text?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_i18n_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_situations: {
        Row: {
          exercise_id: string
          situation_id: string
        }
        Insert: {
          exercise_id: string
          situation_id: string
        }
        Update: {
          exercise_id?: string
          situation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_situations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_situations_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tracks: {
        Row: {
          card_id: string | null
          exercise_id: string
          id: string
          track_id: string
        }
        Insert: {
          card_id?: string | null
          exercise_id: string
          id?: string
          track_id: string
        }
        Update: {
          card_id?: string | null
          exercise_id?: string
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tracks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_tracks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          id: string
          image_url: string | null
          implemented: boolean
          listen_gate_seconds: number
          needs_cards: boolean
          needs_sound: boolean
          sort: number
          timeframe_max: number
          timeframe_min: number
        }
        Insert: {
          id: string
          image_url?: string | null
          implemented?: boolean
          listen_gate_seconds?: number
          needs_cards?: boolean
          needs_sound?: boolean
          sort: number
          timeframe_max: number
          timeframe_min: number
        }
        Update: {
          id?: string
          image_url?: string | null
          implemented?: boolean
          listen_gate_seconds?: number
          needs_cards?: boolean
          needs_sound?: boolean
          sort?: number
          timeframe_max?: number
          timeframe_min?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          language: string | null
          theme: string
          user_id: string
          user_type_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          language?: string | null
          theme?: string
          user_id: string
          user_type_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          language?: string | null
          theme?: string
          user_id?: string
          user_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_type_id_fkey"
            columns: ["user_type_id"]
            isOneToOne: false
            referencedRelation: "user_types"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_statements: {
        Row: {
          created_at: string
          id: string
          language: string | null
          meta: Json
          position: number
          reflection_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id: string
          language?: string | null
          meta?: Json
          position: number
          reflection_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          meta?: Json
          position?: number
          reflection_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_statements_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "reflections"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          body: string
          created_at: string
          id: string
          mode: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          mode: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          mode?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          card_id: string | null
          ended_at: string | null
          exercise_id: string
          id: string
          situation_id: string | null
          started_at: string
          status: string
          step: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          card_id?: string | null
          ended_at?: string | null
          exercise_id: string
          id?: string
          situation_id?: string | null
          started_at?: string
          status: string
          step: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          card_id?: string | null
          ended_at?: string | null
          exercise_id?: string
          id?: string
          situation_id?: string | null
          started_at?: string
          status?: string
          step?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      situation_i18n: {
        Row: {
          label: string
          locale: string
          situation_id: string
        }
        Insert: {
          label: string
          locale: string
          situation_id: string
        }
        Update: {
          label?: string
          locale?: string
          situation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "situation_i18n_situation_id_fkey"
            columns: ["situation_id"]
            isOneToOne: false
            referencedRelation: "situations"
            referencedColumns: ["id"]
          },
        ]
      }
      situations: {
        Row: {
          id: string
          sort: number
        }
        Insert: {
          id: string
          sort: number
        }
        Update: {
          id?: string
          sort?: number
        }
        Relationships: []
      }
      tracks: {
        Row: {
          artist: string
          duration_seconds: number
          id: string
          licence_ref: string | null
          src: string | null
          title: string
        }
        Insert: {
          artist: string
          duration_seconds: number
          id: string
          licence_ref?: string | null
          src?: string | null
          title: string
        }
        Update: {
          artist?: string
          duration_seconds?: number
          id?: string
          licence_ref?: string | null
          src?: string | null
          title?: string
        }
        Relationships: []
      }
      user_type_i18n: {
        Row: {
          image_alt: string
          label: string
          locale: string
          user_type_id: string
        }
        Insert: {
          image_alt: string
          label: string
          locale: string
          user_type_id: string
        }
        Update: {
          image_alt?: string
          label?: string
          locale?: string
          user_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_type_i18n_user_type_id_fkey"
            columns: ["user_type_id"]
            isOneToOne: false
            referencedRelation: "user_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_types: {
        Row: {
          id: string
          image_url: string | null
          implemented: boolean
          sort: number
        }
        Insert: {
          id: string
          image_url?: string | null
          implemented?: boolean
          sort: number
        }
        Update: {
          id?: string
          image_url?: string | null
          implemented?: boolean
          sort?: number
        }
        Relationships: []
      }
    }
    Views: {
      missing_translations: {
        Row: {
          column_name: string | null
          entity: string | null
          issue: string | null
          locale: string | null
          record_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

