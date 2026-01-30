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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          admin_note: string | null
          form_data: Json
          id: string
          note: string | null
          school_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          form_data?: Json
          id?: string
          note?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          form_data?: Json
          id?: string
          note?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      form_configs: {
        Row: {
          cities: string[] | null
          config: Json
          created_at: string
          filieres: Json | null
          id: string
          max_choices: number | null
          rules: Json | null
          school_id: string
          updated_at: string
        }
        Insert: {
          cities?: string[] | null
          config?: Json
          created_at?: string
          filieres?: Json | null
          id?: string
          max_choices?: number | null
          rules?: Json | null
          school_id: string
          updated_at?: string
        }
        Update: {
          cities?: string[] | null
          config?: Json
          created_at?: string
          filieres?: Json | null
          id?: string
          max_choices?: number | null
          rules?: Json | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_configs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bac_grade: number | null
          bac_option: Database["public"]["Enums"]["bac_option"] | null
          bac_year: number | null
          city: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          lycee: string | null
          massar_code: string | null
          national_grade: number | null
          phone: string | null
          regional_grade: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bac_grade?: number | null
          bac_option?: Database["public"]["Enums"]["bac_option"] | null
          bac_year?: number | null
          city?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          lycee?: string | null
          massar_code?: string | null
          national_grade?: number | null
          phone?: string | null
          regional_grade?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bac_grade?: number | null
          bac_option?: Database["public"]["Enums"]["bac_option"] | null
          bac_year?: number | null
          city?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          lycee?: string | null
          massar_code?: string | null
          national_grade?: number | null
          phone?: string | null
          regional_grade?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_refusals: {
        Row: {
          created_at: string
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_refusals_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          allowed_bac_options: Database["public"]["Enums"]["bac_option"][]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          allowed_bac_options?: Database["public"]["Enums"]["bac_option"][]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          allowed_bac_options?: Database["public"]["Enums"]["bac_option"][]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "adherent"
      application_status:
        | "en_attente"
        | "en_cours"
        | "validee"
        | "preselectionne"
        | "admis"
        | "refuse"
      bac_option:
        | "PC"
        | "SVT"
        | "SMA"
        | "SMB"
        | "ECO"
        | "SGC"
        | "SC"
        | "SE"
        | "LET"
        | "SH"
        | "ARTS"
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
      app_role: ["admin", "adherent"],
      application_status: [
        "en_attente",
        "en_cours",
        "validee",
        "preselectionne",
        "admis",
        "refuse",
      ],
      bac_option: [
        "PC",
        "SVT",
        "SMA",
        "SMB",
        "ECO",
        "SGC",
        "SC",
        "SE",
        "LET",
        "SH",
        "ARTS",
      ],
    },
  },
} as const
