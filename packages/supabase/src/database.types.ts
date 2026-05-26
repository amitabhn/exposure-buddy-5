// Hand-authored database types skeleton.
// Will be replaced by `supabase gen types typescript` output in a later story.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
        }
      }
      consent_records: {
        Row: {
          id: string
          user_id: string
          timestamp_utc: string
          purpose_id: string
          consent_version: string
          withdrawal_status: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timestamp_utc: string
          purpose_id: string
          consent_version: string
          withdrawal_status?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timestamp_utc?: string
          purpose_id?: string
          consent_version?: string
          withdrawal_status?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      user_consent_status: {
        Row: {
          id: string
          user_id: string
          timestamp_utc: string
          purpose_id: string
          consent_version: string
          withdrawal_status: boolean
          created_at: string
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
