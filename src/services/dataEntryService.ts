import { supabase } from '@/integrations/supabase/client';
import { DataEntryInsert } from '@/types/dataEntry';

// Types for the manual entry function
export interface ManualEntryData {
  activity_description: string;
  quantity: number;
  unit: string;
  emission_factor?: number;
  ghg_category: 'scope1' | 'scope2' | 'scope3';
  activity_date: string;
  notes?: string;
  supplier_vendor?: string;
  cost?: number;
  currency?: string;
}

// Types for the file upload function
export interface ColumnMapping {
  activity_description: string;
  quantity: string;
  unit: string;
  emission_factor?: string;
  ghg_category: string;
  activity_date: string;
  notes?: string;
  supplier_vendor?: string;
  cost?: string;
  currency?: string;
}

export interface FileUploadRequest {
  file_content: string;
  file_name: string;
  column_mapping: ColumnMapping;
  has_header_row?: boolean;
}

export class DataEntryService {
  static async submitManualEntry(data: ManualEntryData) {
    console.log('Submitting manual entry:', data);
    
    // Get the current session to ensure we have authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No valid session found:', sessionError);
      throw new Error('Authentication required. Please log in again.');
    }

    console.log('Session found, access token present:', !!session.access_token);

    try {
      const { data: result, error } = await supabase.functions.invoke('manual-entry', {
        body: data,  // Send data directly
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Manual entry error:', error);
        throw new Error(error.message || 'Failed to submit manual entry');
      }

      return result;
    } catch (error) {
      console.error('Manual entry error (caught):', error);
      throw error;
    }
  }

  static async uploadFile(fileData: FileUploadRequest) {
    console.log('Submitting file upload:', fileData);
    
    // Get the current session to ensure we have authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('No valid session found:', sessionError);
      throw new Error('Authentication required. Please log in again.');
    }

    console.log('Session found, access token present:', !!session.access_token);

    try {
      const { data: result, error } = await supabase.functions.invoke('file-upload', {
        body: fileData,  // Send data directly
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('File upload error:', error);
        throw new Error(error.message || 'Failed to process file upload');
      }

      return result;
    } catch (error) {
      console.error('File upload error (caught):', error);
      throw error;
    }
  }

  // Convert File object to base64 string for transmission
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (!reader.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        const base64 = reader.result.toString().split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  // Upload file to Supabase storage and return the URL
  static async uploadFileToStorage(file: File, companyId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      console.log(`Uploading file to storage: ${file.name} for company: ${companyId}`);
      
      // Generate unique file path
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${companyId}/uploads/${fileName}`;
      
      // Upload file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('data-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('data-uploads')
        .getPublicUrl(uploadData.path);

      console.log(`File uploaded successfully to: ${publicUrl}`);
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('File upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during file upload' 
      };
    }
  }

  // Create multiple data entries at once
  static async createDataEntries(entries: DataEntryInsert[]): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log(`Creating ${entries.length} data entries...`);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No valid session found:', sessionError);
        throw new Error('Authentication required. Please log in again.');
      }

      // Insert all entries
      const { data, error } = await supabase
        .from('data_entry')
        .insert(entries)
        .select();

      if (error) {
        console.error('Database insert error:', error);
        return { success: false, count: 0, error: error.message };
      }

      console.log(`Successfully created ${data?.length || 0} data entries`);
      return { success: true, count: data?.length || 0 };
    } catch (error) {
      console.error('Error creating data entries:', error);
      return { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error creating entries' 
      };
    }
  }

  // Get data entries for a company
  static async getDataEntries(companyId: string): Promise<{ data: DataEntryInsert[] | null; count: number }> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No valid session found:', sessionError);
        throw new Error('Authentication required. Please log in again.');
      }

      // Get data entries with count
      const { data, error, count } = await supabase
        .from('data_entry')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return { data: null, count: 0 };
      }

      return { data: data as DataEntryInsert[], count: count || 0 };
    } catch (error) {
      console.error('Error getting data entries:', error);
      return { data: null, count: 0 };
    }
  }
}
