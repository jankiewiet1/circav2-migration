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
      leads: {
        Row: {
          id: string
          name: string | null
          email: string
          phone: string | null
          company: string | null
          calculator_results: Json | null
          created_at: string
          updated_at: string
          status: string
          calendly_url: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          phone?: string | null
          company?: string | null
          calculator_results?: Json | null
          created_at?: string
          updated_at?: string
          status?: string
          calendly_url?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          phone?: string | null
          company?: string | null
          calculator_results?: Json | null
          created_at?: string
          updated_at?: string
          status?: string
          calendly_url?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          bank_name: string | null
          billing_address: string | null
          billing_email: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_title: string | null
          country: string | null
          created_at: string | null
          created_by_user_id: string | null
          iban: string | null
          id: string
          industry: string | null
          kvk_number: string | null
          name: string
          phone_number: string | null
          postal_code: string | null
          setup_completed: boolean | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          bank_name?: string | null
          billing_address?: string | null
          billing_email?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          iban?: string | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          name: string
          phone_number?: string | null
          postal_code?: string | null
          setup_completed?: boolean | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          bank_name?: string | null
          billing_address?: string | null
          billing_email?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_title?: string | null
          country?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          iban?: string | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          name?: string
          phone_number?: string | null
          postal_code?: string | null
          setup_completed?: boolean | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          role: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          role?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          joined_at: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_preferences: {
        Row: {
          company_id: string
          created_at: string | null
          default_view: string
          emission_unit: string
          fiscal_year_start_month: string | null
          id: string
          language: string | null
          preferred_currency: string | null
          preferred_emission_source: string | null
          reporting_frequency: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_view?: string
          emission_unit?: string
          fiscal_year_start_month?: string | null
          id?: string
          language?: string | null
          preferred_currency?: string | null
          preferred_emission_source?: string | null
          reporting_frequency?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_view?: string
          emission_unit?: string
          fiscal_year_start_month?: string | null
          id?: string
          language?: string | null
          preferred_currency?: string | null
          preferred_emission_source?: string | null
          reporting_frequency?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_calc_climatiq: {
        Row: {
          id: string
          company_id: string
          entry_id: string
          calculated_at: string | null
          total_emissions: number | null
          emissions_unit: string | null
          scope: string | null
          climatiq_activity_id: string | null
          climatiq_emissions_factor_id: string | null
          climatiq_factor_name: string | null
          climatiq_region: string | null
          climatiq_category: string | null
          climatiq_source: string | null
          climatiq_year: number | null
          co2_emissions: number | null
          ch4_emissions: number | null
          n2o_emissions: number | null
          activity_data: any | null
          request_params: any | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          entry_id: string
          calculated_at?: string | null
          total_emissions?: number | null
          emissions_unit?: string | null
          scope?: string | null
          climatiq_activity_id?: string | null
          climatiq_emissions_factor_id?: string | null
          climatiq_factor_name?: string | null
          climatiq_region?: string | null
          climatiq_category?: string | null
          climatiq_source?: string | null
          climatiq_year?: number | null
          co2_emissions?: number | null
          ch4_emissions?: number | null
          n2o_emissions?: number | null
          activity_data?: any | null
          request_params?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          entry_id?: string
          calculated_at?: string | null
          total_emissions?: number | null
          emissions_unit?: string | null
          scope?: string | null
          climatiq_activity_id?: string | null
          climatiq_emissions_factor_id?: string | null
          climatiq_factor_name?: string | null
          climatiq_region?: string | null
          climatiq_category?: string | null
          climatiq_source?: string | null
          climatiq_year?: number | null
          co2_emissions?: number | null
          ch4_emissions?: number | null
          n2o_emissions?: number | null
          activity_data?: any | null
          request_params?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_calc_climatiq_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_calc_climatiq_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "emission_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_entries: {
        Row: {
          category: string
          company_id: string
          created_at: string
          date: string
          description: string
          embedding: string | null
          id: string
          match_status: string | null
          notes: string | null
          quantity: number
          scope: number | null
          unit: string
          updated_at: string
          upload_session_id: string | null
          year: number | null
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          date: string
          description: string
          embedding?: string | null
          id?: string
          match_status?: string | null
          notes?: string | null
          quantity: number
          scope?: number | null
          unit: string
          updated_at?: string
          upload_session_id?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          embedding?: string | null
          id?: string
          match_status?: string | null
          notes?: string | null
          quantity?: number
          scope?: number | null
          unit?: string
          updated_at?: string
          upload_session_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_factors: {
        Row: {
          category_1: string | null
          category_2: string | null
          category_3: string | null
          category_4: string | null
          embedding: string | null
          "GHG Conversion Factor": number | null
          "GHG/Unit": string | null
          id: number
          Scope: string | null
          Source: string | null
          uom: string | null
        }
        Insert: {
          category_1?: string | null
          category_2?: string | null
          category_3?: string | null
          category_4?: string | null
          embedding?: string | null
          "GHG Conversion Factor"?: number | null
          "GHG/Unit"?: string | null
          id?: number
          Scope?: string | null
          Source?: string | null
          uom?: string | null
        }
        Update: {
          category_1?: string | null
          category_2?: string | null
          category_3?: string | null
          category_4?: string | null
          embedding?: string | null
          "GHG Conversion Factor"?: number | null
          "GHG/Unit"?: string | null
          id?: number
          Scope?: string | null
          Source?: string | null
          uom?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          phone_number: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          phone_number?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          phone_number?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          audit_logging_enabled: boolean | null
          created_at: string | null
          date_format: string | null
          default_member_role: string | null
          id: string
          language: string | null
          lock_team_changes: boolean | null
          preferred_currency: string | null
          receive_deadline_notifications: boolean | null
          receive_newsletter: boolean | null
          receive_upload_alerts: boolean | null
          require_reviewer: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audit_logging_enabled?: boolean | null
          created_at?: string | null
          date_format?: string | null
          default_member_role?: string | null
          id?: string
          language?: string | null
          lock_team_changes?: boolean | null
          preferred_currency?: string | null
          receive_deadline_notifications?: boolean | null
          receive_newsletter?: boolean | null
          receive_upload_alerts?: boolean | null
          require_reviewer?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audit_logging_enabled?: boolean | null
          created_at?: string | null
          date_format?: string | null
          default_member_role?: string | null
          id?: string
          language?: string | null
          lock_team_changes?: boolean | null
          preferred_currency?: string | null
          receive_deadline_notifications?: boolean | null
          receive_newsletter?: boolean | null
          receive_upload_alerts?: boolean | null
          require_reviewer?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      unit_conversions: {
        Row: {
          category: string
          multiplier: number
          standard_unit: string
          unit_from: string
        }
        Insert: {
          category: string
          multiplier: number
          standard_unit: string
          unit_from: string
        }
        Update: {
          category?: string
          multiplier?: number
          standard_unit?: string
          unit_from?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_entries_by_year_and_scope: {
        Row: {
          company_id: string | null
          scope: number | null
          total_kg_co2e: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_monthly_by_scope: {
        Row: {
          company_id: string | null
          month: string | null
          scope: number | null
          total_kg_co2e: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_emissions_for_entry: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      calculate_ghg_emissions: {
        Args: { _company_id: string }
        Returns: {
          entry_id: string
          co2_emissions: number
          ch4_emissions: number
          n2o_emissions: number
          total_emissions: number
          emission_factor: number
          match_status: string
        }[]
      }
      calculate_scope_emissions: {
        Args: { p_company_id: string; p_scope: string; p_source?: string }
        Returns: {
          entry_id: string
          category: string
          unit: string
          quantity: number
          date: string
          co2_factor: number
          ch4_factor: number
          n2o_factor: number
          co2_emissions: number
          ch4_emissions: number
          n2o_emissions: number
          total_emissions: number
        }[]
      }
      generate_category_text: {
        Args: {
          category_1: string
          category_2: string
          category_3: string
          category_4: string
        }
        Returns: string
      }
      get_dashboard_data: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_emission_calculation_status: {
        Args: { p_company_id: string; p_scope: string }
        Returns: Json
      }
      get_entries_without_calculations: {
        Args:
          | { batch_limit: number }
          | { batch_limit: number; p_cursor?: string }
        Returns: {
          id: string
          company_id: string
          date: string
          quantity: number
          unit: string
          embedding: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_categories: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
          table_name: string
        }
        Returns: {
          id: number
          category_1: string
          category_2: string
          category_3: string
          category_4: string
          uom: string
          similarity: number
        }[]
      }
      match_categories_with_factors: {
        Args: {
          query_embedding: string
          match_threshold: number
          match_count: number
        }
        Returns: {
          category_1: string
          category_2: string
          category_3: string
          category_4: string
          similarity: number
          factors: Json
        }[]
      }
      match_emission_factor: {
        Args: { query_embedding: string; match_threshold?: number }
        Returns: {
          id: number
          scope: string
          category_1: string
          category_2: string
          category_3: string
          category_4: string
          uom: string
          source: string
          conversion_factor: number
          similarity: number
        }[]
      }
      normalize_unit: {
        Args: { raw_value: number; raw_unit: string }
        Returns: {
          norm_value: number
          norm_unit: string
        }[]
      }
      process_all_emission_entries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_emission_entries_batch: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_emission_entry: {
        Args: { entry_id: string }
        Returns: {
          calculation_id: string
          matched_factor_id: number
          source: string
          total_emissions: number
        }[]
      }
      process_single_emission_entry: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      calculation_status: "pending" | "matched" | "factor_not_found" | "error"
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
      calculation_status: ["pending", "matched", "factor_not_found", "error"],
    },
  },
} as const
