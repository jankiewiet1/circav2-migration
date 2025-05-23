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
      ai_processing_logs: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          operation: string
          processing_time: number | null
          success: boolean
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          operation: string
          processing_time?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          operation?: string
          processing_time?: number | null
          success?: boolean
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_processing_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      content_translations: {
        Row: {
          content_type: string
          created_at: string | null
          de_text: string | null
          en_text: string
          id: string
          key: string
          nl_text: string | null
          updated_at: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          de_text?: string | null
          en_text: string
          id?: string
          key: string
          nl_text?: string | null
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          de_text?: string | null
          en_text?: string
          id?: string
          key?: string
          nl_text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      data_entry: {
        Row: {
          activity_description: string
          ai_confidence: number | null
          ai_notes: string | null
          ai_processed: boolean | null
          company_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          custom_tags: Json | null
          date: string
          emission_factor_reference: string | null
          ghg_category: string
          id: string
          notes: string | null
          original_file_reference: string | null
          quantity: number
          source_type: string
          status: string
          supplier_vendor: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          activity_description: string
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_processed?: boolean | null
          company_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_tags?: Json | null
          date: string
          emission_factor_reference?: string | null
          ghg_category: string
          id?: string
          notes?: string | null
          original_file_reference?: string | null
          quantity: number
          source_type: string
          status?: string
          supplier_vendor?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          activity_description?: string
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_processed?: boolean | null
          company_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          custom_tags?: Json | null
          date?: string
          emission_factor_reference?: string | null
          ghg_category?: string
          id?: string
          notes?: string | null
          original_file_reference?: string | null
          quantity?: number
          source_type?: string
          status?: string
          supplier_vendor?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_entry_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_calc_climatiq: {
        Row: {
          activity_data: Json | null
          calculated_at: string
          ch4_emissions: number | null
          climatiq_activity_id: string | null
          climatiq_category: string | null
          climatiq_emissions_factor_id: string | null
          climatiq_factor_name: string | null
          climatiq_region: string | null
          climatiq_source: string | null
          climatiq_year: number | null
          co2_emissions: number | null
          company_id: string
          created_at: string
          emissions_unit: string
          entry_id: string | null
          id: string
          n2o_emissions: number | null
          request_params: Json | null
          scope: number | null
          total_emissions: number
          updated_at: string | null
        }
        Insert: {
          activity_data?: Json | null
          calculated_at?: string
          ch4_emissions?: number | null
          climatiq_activity_id?: string | null
          climatiq_category?: string | null
          climatiq_emissions_factor_id?: string | null
          climatiq_factor_name?: string | null
          climatiq_region?: string | null
          climatiq_source?: string | null
          climatiq_year?: number | null
          co2_emissions?: number | null
          company_id: string
          created_at?: string
          emissions_unit?: string
          entry_id?: string | null
          id?: string
          n2o_emissions?: number | null
          request_params?: Json | null
          scope?: number | null
          total_emissions: number
          updated_at?: string | null
        }
        Update: {
          activity_data?: Json | null
          calculated_at?: string
          ch4_emissions?: number | null
          climatiq_activity_id?: string | null
          climatiq_category?: string | null
          climatiq_emissions_factor_id?: string | null
          climatiq_factor_name?: string | null
          climatiq_region?: string | null
          climatiq_source?: string | null
          climatiq_year?: number | null
          co2_emissions?: number | null
          company_id?: string
          created_at?: string
          emissions_unit?: string
          entry_id?: string | null
          id?: string
          n2o_emissions?: number | null
          request_params?: Json | null
          scope?: number | null
          total_emissions?: number
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
            isOneToOne: false
            referencedRelation: "emission_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_calculations_legacy: {
        Row: {
          calculated_at: string | null
          ch4_emissions: number | null
          ch4_factor: number | null
          co2_emissions: number | null
          co2_factor: number | null
          company_id: string
          date: string | null
          emission_factor_id: number | null
          entry_id: string
          id: string
          matched_category_1: string | null
          matched_category_2: string | null
          matched_category_3: string | null
          matched_category_4: string | null
          matched_factor_id: string | null
          matched_ghg_unit: string | null
          matched_similarity: number | null
          matched_uom: string | null
          n2o_emissions: number | null
          n2o_factor: number | null
          source: string | null
          status: Database["public"]["Enums"]["calculation_status"]
          total_emissions: number | null
        }
        Insert: {
          calculated_at?: string | null
          ch4_emissions?: number | null
          ch4_factor?: number | null
          co2_emissions?: number | null
          co2_factor?: number | null
          company_id: string
          date?: string | null
          emission_factor_id?: number | null
          entry_id: string
          id?: string
          matched_category_1?: string | null
          matched_category_2?: string | null
          matched_category_3?: string | null
          matched_category_4?: string | null
          matched_factor_id?: string | null
          matched_ghg_unit?: string | null
          matched_similarity?: number | null
          matched_uom?: string | null
          n2o_emissions?: number | null
          n2o_factor?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["calculation_status"]
          total_emissions?: number | null
        }
        Update: {
          calculated_at?: string | null
          ch4_emissions?: number | null
          ch4_factor?: number | null
          co2_emissions?: number | null
          co2_factor?: number | null
          company_id?: string
          date?: string | null
          emission_factor_id?: number | null
          entry_id?: string
          id?: string
          matched_category_1?: string | null
          matched_category_2?: string | null
          matched_category_3?: string | null
          matched_category_4?: string | null
          matched_factor_id?: string | null
          matched_ghg_unit?: string | null
          matched_similarity?: number | null
          matched_uom?: string | null
          n2o_emissions?: number | null
          n2o_factor?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["calculation_status"]
          total_emissions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "emission_calculations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emission_calculations_entry_id_fkey"
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
      emission_factors_legacy: {
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
      leads: {
        Row: {
          additional_comments: string | null
          calculator_results: Json | null
          calendly_url: string | null
          company: string | null
          company_address: string | null
          company_fte: string | null
          company_name: string | null
          company_size: string | null
          created_at: string | null
          email: string
          esg_reporting_hours: number | null
          first_name: string | null
          id: string
          industry: string | null
          kvk_number: string | null
          last_name: string | null
          motivations: string[] | null
          name: string | null
          notes: string | null
          phone: string | null
          platform_value_perception: number | null
          reduction_target: string | null
          reduction_year: string | null
          status: string | null
          target_emissions: number | null
          updated_at: string | null
          used_co2_calculator: boolean | null
          website: string | null
        }
        Insert: {
          additional_comments?: string | null
          calculator_results?: Json | null
          calendly_url?: string | null
          company?: string | null
          company_address?: string | null
          company_fte?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          email: string
          esg_reporting_hours?: number | null
          first_name?: string | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          last_name?: string | null
          motivations?: string[] | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          platform_value_perception?: number | null
          reduction_target?: string | null
          reduction_year?: string | null
          status?: string | null
          target_emissions?: number | null
          updated_at?: string | null
          used_co2_calculator?: boolean | null
          website?: string | null
        }
        Update: {
          additional_comments?: string | null
          calculator_results?: Json | null
          calendly_url?: string | null
          company?: string | null
          company_address?: string | null
          company_fte?: string | null
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          email?: string
          esg_reporting_hours?: number | null
          first_name?: string | null
          id?: string
          industry?: string | null
          kvk_number?: string | null
          last_name?: string | null
          motivations?: string[] | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          platform_value_perception?: number | null
          reduction_target?: string | null
          reduction_year?: string | null
          status?: string | null
          target_emissions?: number | null
          updated_at?: string | null
          used_co2_calculator?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          company_size: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          kvk_number: string | null
          last_name: string | null
          phone_number: string | null
          website: string | null
        }
        Insert: {
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          industry?: string | null
          job_title?: string | null
          kvk_number?: string | null
          last_name?: string | null
          phone_number?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string | null
          company_size?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          kvk_number?: string | null
          last_name?: string | null
          phone_number?: string | null
          website?: string | null
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
      waitlist: {
        Row: {
          company_address: string
          company_name: string
          company_size: string
          company_website: string | null
          created_at: string
          email: string
          first_name: string
          goals: Json
          id: string
          industry: string
          last_name: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_address: string
          company_name: string
          company_size: string
          company_website?: string | null
          created_at?: string
          email: string
          first_name: string
          goals: Json
          id?: string
          industry: string
          last_name: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_address?: string
          company_name?: string
          company_size?: string
          company_website?: string | null
          created_at?: string
          email?: string
          first_name?: string
          goals?: Json
          id?: string
          industry?: string
          last_name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      data_entry_with_emissions: {
        Row: {
          activity_description: string | null
          ai_confidence: number | null
          ai_notes: string | null
          ai_processed: boolean | null
          climatiq_activity_id: string | null
          climatiq_factor_name: string | null
          climatiq_source: string | null
          company_id: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_tags: Json | null
          date: string | null
          emission_factor_reference: string | null
          emissions_unit: string | null
          ghg_category: string | null
          id: string | null
          notes: string | null
          original_file_reference: string | null
          quantity: number | null
          source_type: string | null
          status: string | null
          supplier_vendor: string | null
          total_emissions: number | null
          unit: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_entry_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_emissions_by_scope: {
        Row: {
          company_name: string | null
          emissions_unit: string | null
          month: string | null
          scope: number | null
          total_emissions: number | null
        }
        Relationships: []
      }
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
      calculate_emissions_climatiq: {
        Args: { entry_id: string }
        Returns: Json
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
          | { batch_limit?: number; cursor_id?: string }
        Returns: {
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
      insert_emission_entry: {
        Args: {
          p_company_id: string
          p_date: string
          p_category: string
          p_description: string
          p_quantity: number
          p_unit: string
          p_scope: number
          p_notes: string
        }
        Returns: string
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
      manual_entry_function: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
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
      migrate_emission_entries_to_data_entry: {
        Args: Record<PropertyKey, never>
        Returns: {
          migrated_count: number
          message: string
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
