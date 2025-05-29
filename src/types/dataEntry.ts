import { Database } from '@/integrations/supabase/types';

// Source types for the data_entry table
export type DataEntrySourceType = 
  | 'invoice' 
  | 'utility bill' 
  | 'ERP' 
  | 'API' 
  | 'manual entry'
  | 'email'
  | 'pdf'
  | 'csv'
  | 'excel'
  | 'image';

// Status types for the data_entry table
export type DataEntryStatus = 
  | 'raw'        // Initial state, just uploaded/entered
  | 'processed'  // AI has processed but not validated by user
  | 'validated'  // User has confirmed the mapping
  | 'error';     // Error in processing

// GHG Category types
export type GHGCategory = 'Scope 1' | 'Scope 2' | 'Scope 3';

// Custom tags structure
export interface DataEntryTags {
  [key: string]: string | number | boolean;
}

// Main Data Entry type matching the database structure
export interface DataEntry {
  id: string;
  company_id: string;
  
  // Basic data fields
  date: string; // ISO format date
  source_type: DataEntrySourceType;
  supplier_vendor?: string;
  activity_description: string;
  quantity: number;
  unit: string;
  currency?: string;
  cost?: number;
  
  // Categorization
  ghg_category: GHGCategory;
  emission_factor_reference?: string;
  
  // Metadata
  status: DataEntryStatus;
  custom_tags?: DataEntryTags;
  notes?: string;
  
  // System fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // AI processing tracking
  ai_processed: boolean;
  ai_confidence?: number;
  ai_notes?: string;
  original_file_reference?: string;
}

// For creating a new data entry
export type DataEntryInsert = Omit<
  DataEntry, 
  'id' | 'created_at' | 'updated_at' | 'ai_processed'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  ai_processed?: boolean;
};

// For updating an existing data entry
export type DataEntryUpdate = Partial<DataEntryInsert>;

// Data entry with calculated emissions
export interface DataEntryWithEmissions extends DataEntry {
  total_emissions?: number;
  emissions_unit?: string;
  activity_id?: string;
  factor_name?: string;
  source?: string;
}

// AI processing result for mapping fields
export interface AIFieldMapping {
  original_header: string;
  mapped_field: keyof DataEntry;
  confidence: number;
  suggestions?: string[];
}

// File upload metadata
export interface UploadedFileMetadata {
  filename: string;
  file_type: string;
  uploaded_at: string;
  file_size: number;
  page_count?: number; // For PDFs
  sheet_names?: string[]; // For Excel files
  preview_url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message?: string;
}

// Response from AI data extraction
export interface AIDataExtractionResponse {
  success: boolean;
  message: string;
  mappings: AIFieldMapping[];
  extracted_data: Partial<DataEntry>[];
  confidence_score: number;
  unmapped_fields: string[];
  ambiguous_fields: AIFieldMapping[];
  requires_user_review: boolean;
}

export interface EmissionCalculationResult {
  co2e: number;
  co2e_unit: string;
  source: string;
  category: string;
  calculatedAt: string;
  scope: number;
  activityData: {
    [key: string]: any;
  };
  activity_id?: string;
  factor_name?: string;
} 