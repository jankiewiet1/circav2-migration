import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DataEntry,
  DataEntryInsert,
  DataEntryUpdate,
  DataEntryWithEmissions,
  UploadedFileMetadata,
  AIDataExtractionResponse,
  AIFieldMapping
} from "@/types/dataEntry";
import { ErrorMonitoringService } from './errorMonitoringService';

/**
 * DataEntryService provides methods to interact with the data_entry table
 */
export const DataEntryService = {
  /**
   * Get all data entries for a company
   */
  async getDataEntries(
    companyId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: DataEntry[]; count: number }> {
    try {
      const {
        limit = 100,
        offset = 0,
        status,
        sort_by = 'date',
        sort_order = 'desc'
      } = options;
      
      // Start building the query
      let query = supabase
        .from('data_entry')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(offset, offset + limit - 1);
      
      // Add status filter if provided
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        data: data as DataEntry[],
        count: count || 0
      };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.getDataEntries',
        message: 'Failed to get data entries',
        error_details: { error },
        company_id: companyId,
        severity: 'error',
        source: 'client'
      });
      
      return {
        data: [],
        count: 0
      };
    }
  },

  /**
   * Get a single data entry by ID
   */
  async getDataEntry(id: string): Promise<DataEntry | null> {
    try {
      const { data, error } = await supabase
        .from('data_entry')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as DataEntry;
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.getDataEntry',
        message: 'Failed to get data entry',
        error_details: { error, id },
        severity: 'error',
        source: 'client'
      });
      
      return null;
    }
  },

  /**
   * Create new data entries
   */
  async createDataEntries(entries: DataEntryInsert[]): Promise<{ success: boolean; count: number; ids: string[] }> {
    try {
      if (!entries.length) {
        return { success: true, count: 0, ids: [] };
      }
      
      const { data, error } = await supabase
        .from('data_entry')
        .insert(entries)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        count: data.length,
        ids: data.map(item => item.id)
      };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.createDataEntries',
        message: 'Failed to create data entries',
        error_details: { error, entriesCount: entries.length },
        company_id: entries[0]?.company_id,
        severity: 'error',
        source: 'client'
      });
      
      return {
        success: false,
        count: 0,
        ids: []
      };
    }
  },

  /**
   * Update a data entry
   */
  async updateDataEntry(id: string, updates: Partial<DataEntry>): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('data_entry')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.updateDataEntry',
        message: 'Failed to update data entry',
        error_details: { error, id },
        severity: 'error',
        source: 'client'
      });
      
      return { success: false };
    }
  },

  /**
   * Delete a data entry
   */
  async deleteDataEntry(id: string): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from('data_entry')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.deleteDataEntry',
        message: 'Failed to delete data entry',
        error_details: { error, id },
        severity: 'error',
        source: 'client'
      });
      
      return { success: false };
    }
  },

  /**
   * Upload a file and get a URL
   */
  async uploadFile(file: File, companyId: string): Promise<{ success: boolean; url?: string }> {
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${companyId}/uploads/${fileName}`;
      
      console.log('Uploading file to:', filePath);
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      
      // Use content type based on file extension if needed
      let contentType = file.type;
      if (!contentType || contentType === 'application/octet-stream') {
        if (fileExt === 'csv') contentType = 'text/csv';
        else if (fileExt === 'pdf') contentType = 'application/pdf';
        else if (fileExt === 'xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
      
      // Upload the file to the data-uploads bucket
      const { data, error } = await supabase
        .storage
        .from('data-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('data-uploads')
        .getPublicUrl(data.path);
      
      console.log('File uploaded successfully:', urlData.publicUrl);
      
      return {
        success: true,
        url: urlData.publicUrl
      };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      ErrorMonitoringService.logError({
        component: 'DataEntryService.uploadFile',
        message: 'Failed to upload file',
        error_details: { error, fileName: file.name, fileType: file.type, fileSize: file.size },
        company_id: companyId,
        severity: 'error',
        source: 'client'
      });
      
      return { success: false };
    }
  },

  /**
   * Bulk update status of data entries
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'raw' | 'processed' | 'validated' | 'error'
  ): Promise<{ success: boolean; count: number }> {
    try {
      if (!ids.length) {
        return { success: true, count: 0 };
      }
      
      const { data, error } = await supabase
        .from('data_entry')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id');
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        count: data.length
      };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.bulkUpdateStatus',
        message: 'Failed to bulk update status',
        error_details: { error, ids, status },
        severity: 'error',
        source: 'client'
      });
      
      return {
        success: false,
        count: 0
      };
    }
  },

  /**
   * Get statistics for data entries
   */
  async getDataStats(companyId: string): Promise<{ 
    total: number;
    by_status: Record<string, number>;
    by_category: Record<string, number>;
  }> {
    try {
      // Get total count
      const { count: total, error: countError } = await supabase
        .from('data_entry')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      if (countError) {
        throw countError;
      }
      
      // Get count by status
      const { data: statusData, error: statusError } = await supabase
        .from('data_entry')
        .select('status, count')
        .eq('company_id', companyId)
        .group('status');
      
      if (statusError) {
        throw statusError;
      }
      
      // Get count by category
      const { data: categoryData, error: categoryError } = await supabase
        .from('data_entry')
        .select('ghg_category, count')
        .eq('company_id', companyId)
        .group('ghg_category');
      
      if (categoryError) {
        throw categoryError;
      }
      
      // Format the results
      const byStatus: Record<string, number> = {};
      statusData.forEach(item => {
        byStatus[item.status] = parseInt(item.count);
      });
      
      const byCategory: Record<string, number> = {};
      categoryData.forEach(item => {
        byCategory[item.ghg_category] = parseInt(item.count);
      });
      
      return {
        total: total || 0,
        by_status: byStatus,
        by_category: byCategory
      };
    } catch (error) {
      ErrorMonitoringService.logError({
        component: 'DataEntryService.getDataStats',
        message: 'Failed to get data stats',
        error_details: { error },
        company_id: companyId,
        severity: 'error',
        source: 'client'
      });
      
      return {
        total: 0,
        by_status: {},
        by_category: {}
      };
    }
  },

  /**
   * Upload a file for AI processing
   */
  async uploadFileForAI(
    companyId: string,
    file: File,
    options?: {
      sourceType?: string;
      customTags?: Record<string, any>;
    }
  ): Promise<{ metadata: UploadedFileMetadata | null; error: any }> {
    try {
      // 1. Create a unique file path
      const timestamp = new Date().getTime();
      const filePath = `${companyId}/uploads/${timestamp}_${file.name}`;
      
      console.log('Uploading file for AI processing:', filePath);
      
      // 2. Upload the file to the data-uploads bucket
      const { data, error: uploadError } = await supabase
        .storage
        .from('data-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // 3. Create file metadata record
      const metadata: UploadedFileMetadata = {
        filename: file.name,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
        file_size: file.size,
        status: 'processing',
      };
      
      // If it's a PDF, try to get page count (this would require a server function in practice)
      if (file.type === 'application/pdf') {
        metadata.page_count = 0; // This would be determined by backend
      }
      
      // 4. Get a public URL for the file
      const { data: urlData } = await supabase
        .storage
        .from('data-uploads')
        .getPublicUrl(data.path);
      
      if (urlData) {
        metadata.preview_url = urlData.publicUrl;
      }
      
      console.log('File uploaded successfully for AI processing:', urlData.publicUrl);
      toast.success(`File ${file.name} uploaded successfully`);
      
      return { metadata, error: null };
    } catch (error: any) {
      console.error('Error uploading file for AI:', error);
      toast.error('Failed to upload file');
      return { metadata: null, error };
    }
  },
  
  /**
   * Process extracted data with AI
   * Note: This would connect to a serverless function in real implementation
   */
  async processExtractedData(
    extractedData: any,
    fileType: string
  ): Promise<AIDataExtractionResponse> {
    // Mock implementation for now
    // In real implementation, this would call an edge function or API
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // This is a placeholder for the actual AI processing logic
    const mockResponse: AIDataExtractionResponse = {
      success: true,
      message: "Data extracted successfully",
      confidence_score: 0.85,
      mappings: [],
      extracted_data: [],
      unmapped_fields: [],
      ambiguous_fields: [],
      requires_user_review: true
    };
    
    // We would analyze the extracted data here
    // For now, just return a successful placeholder
    
    return mockResponse;
  },
  
  /**
   * Calculate emissions for data entries
   */
  async calculateEmissions(
    companyId: string,
    entryIds?: string[]
  ): Promise<{ success: boolean; message: string; processedCount: number }> {
    try {
      // This would call the Climatiq API through an edge function
      // For now, we're mocking the behavior
      
      const message = entryIds 
        ? `Calculating emissions for ${entryIds.length} entries` 
        : 'Calculating emissions for all unprocessed entries';
      
      toast.info(message);
      
      // In a real implementation, we'd call an edge function
      return {
        success: true,
        message: 'Emission calculations completed',
        processedCount: entryIds?.length || 0
      };
    } catch (error: any) {
      console.error('Error calculating emissions:', error);
      toast.error('Failed to calculate emissions');
      return {
        success: false,
        message: error.message || 'Failed to calculate emissions',
        processedCount: 0
      };
    }
  },
  
  /**
   * Validate a batch of entries that have been processed by AI
   */
  async validateEntries(
    entryIds: string[],
    validationStatus: 'validated' | 'error',
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('data_entry')
        .update({
          status: validationStatus,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .in('id', entryIds);
      
      if (error) throw error;
      
      toast.success(`${entryIds.length} entries marked as ${validationStatus}`);
      return {
        success: true,
        message: `${entryIds.length} entries updated successfully`
      };
    } catch (error: any) {
      console.error('Error validating entries:', error);
      toast.error('Failed to validate entries');
      return {
        success: false,
        message: error.message || 'Failed to validate entries'
      };
    }
  },
  
  /**
   * Migrate data from emission_entries to data_entry table
   */
  async migrateEmissionEntries(companyId: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // Call the database function to migrate data
      const { data, error } = await supabase.rpc('migrate_emission_entries_to_data_entry');
      
      if (error) throw error;
      
      // Get count of migrated entries
      const { count } = await supabase
        .from('data_entry')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      return {
        success: true,
        message: 'Emission entries migrated successfully',
        count: count || 0
      };
    } catch (error: any) {
      console.error('Error migrating emission entries:', error);
      toast.error('Failed to migrate emission entries');
      return {
        success: false,
        message: error.message || 'Failed to migrate emission entries',
        count: 0
      };
    }
  }
};

export default DataEntryService; 