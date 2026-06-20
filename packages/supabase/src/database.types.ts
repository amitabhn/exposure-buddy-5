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
      analytics_events: {
        Row: {
          created_at: string | null
          device_context: Json | null
          event_type: string
          id: string
          session_token: string | null
          user_pseudonym: string | null
        }
        Insert: {
          created_at?: string | null
          device_context?: Json | null
          event_type: string
          id?: string
          session_token?: string | null
          user_pseudonym?: string | null
        }
        Update: {
          created_at?: string | null
          device_context?: Json | null
          event_type?: string
          id?: string
          session_token?: string | null
          user_pseudonym?: string | null
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          consent_version: string
          created_at: string
          id: string
          purpose_id: string
          timestamp_utc: string
          user_id: string | null
          withdrawal_status: boolean
        }
        Insert: {
          consent_version: string
          created_at?: string
          id?: string
          purpose_id: string
          timestamp_utc: string
          user_id?: string | null
          withdrawal_status?: boolean
        }
        Update: {
          consent_version?: string
          created_at?: string
          id?: string
          purpose_id?: string
          timestamp_utc?: string
          user_id?: string | null
          withdrawal_status?: boolean
        }
        Relationships: []
      }
      device_push_tokens: {
        Row: {
          id: string
          last_seen_at: string
          platform: string
          registered_at: string
          token: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          platform: string
          registered_at?: string
          token: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          platform?: string
          registered_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      dpo_audit_log: {
        Row: {
          acting_operator_id: string
          action_type: string
          id: string
          metadata: Json | null
          outcome: string
          target_user_id: string
          timestamp_utc: string
        }
        Insert: {
          acting_operator_id: string
          action_type: string
          id?: string
          metadata?: Json | null
          outcome: string
          target_user_id: string
          timestamp_utc?: string
        }
        Update: {
          acting_operator_id?: string
          action_type?: string
          id?: string
          metadata?: Json | null
          outcome?: string
          target_user_id?: string
          timestamp_utc?: string
        }
        Relationships: []
      }
      dpo_operators: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          id: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      exposure_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          expires_at: number | null
          fear_item_id: string | null
          id: string
          post_session_reflection: string | null
          pre_session_intention: string | null
          session_type: string
          started_at: string
          status: string
          technique: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          expires_at?: number | null
          fear_item_id?: string | null
          id?: string
          post_session_reflection?: string | null
          pre_session_intention?: string | null
          session_type?: string
          started_at?: string
          status?: string
          technique?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          expires_at?: number | null
          fear_item_id?: string | null
          id?: string
          post_session_reflection?: string | null
          pre_session_intention?: string | null
          session_type?: string
          started_at?: string
          status?: string
          technique?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exposure_sessions_fear_item_id_fkey"
            columns: ["fear_item_id"]
            isOneToOne: false
            referencedRelation: "fear_ladder_items"
            referencedColumns: ["id"]
          },
        ]
      }
      fear_ladder_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          peak_suds: number | null
          position: number
          predicted_suds: number
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          peak_suds?: number | null
          position: number
          predicted_suds: number
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          peak_suds?: number | null
          position?: number
          predicted_suds?: number
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      suds_readings: {
        Row: {
          id: string
          recorded_at: string | null
          session_id: string
          suds_value: number
        }
        Insert: {
          id?: string
          recorded_at?: string | null
          session_id: string
          suds_value: number
        }
        Update: {
          id?: string
          recorded_at?: string | null
          session_id?: string
          suds_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "suds_readings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "exposure_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_patient_relationships: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          patient_user_id: string
          therapist_user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          patient_user_id: string
          therapist_user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          patient_user_id?: string
          therapist_user_id?: string
        }
        Relationships: []
      }
      user_onboarding_metadata: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          suds_calibration_value: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          suds_calibration_value: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          suds_calibration_value?: number
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          deletion_requested_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_consent_status: {
        Row: {
          consent_version: string | null
          created_at: string | null
          id: string | null
          purpose_id: string | null
          timestamp_utc: string | null
          user_id: string | null
          withdrawal_status: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      perform_user_erasure: {
        Args: { p_target_user_id: string }
        Returns: undefined
      }
      swap_ladder_positions: {
        Args: {
          p_item_a_id: string
          p_item_a_new_position: number
          p_item_b_id: string
          p_item_b_new_position: number
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

