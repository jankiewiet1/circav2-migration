/**
 * Carbon Data Recognition Agent Wrapper
 * 
 * This module provides a JavaScript interface to the Python-based
 * Carbon Data Recognition Agent.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize the Carbon Data Recognition Agent
 * @returns {Object} The agent interface
 */
export function createCarbonDataAgent() {
  return {
    /**
     * Process a file using the Carbon Data Recognition Agent
     * 
     * @param {File} file - The file to process
     * @param {string} companyId - The company ID for the data
     * @returns {Promise<Object>} The processed data
     */
    async processFile(file, companyId) {
      try {
        console.log(`Processing file: ${file.name} for company: ${companyId}`);
        
        // 1. Upload the file to Supabase Storage
        const filePath = `uploads/${companyId}/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('data-uploads')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`File upload failed: ${uploadError.message}`);
        }
        
        // 2. Get the public URL for the file
        const { data: { publicUrl } } = supabase
          .storage
          .from('data-uploads')
          .getPublicUrl(filePath);
          
        console.log('File uploaded successfully:', publicUrl);
        
        // 3. Process the file using the agent via Supabase Edge Function
        console.log('Calling Edge Function with:', {
          operation: 'process_file',
          fileUrl: publicUrl,
          companyId,
          agent: true
        });
        
        const { data, error } = await supabase.functions.invoke('process-ai-data', {
          body: {
            operation: 'process_file',
            fileUrl: publicUrl,
            companyId,
            agent: true, // Flag to use the agent-based processing
          }
        });
        
        if (error) {
          console.error('Error processing file with agent:', error);
          throw new Error(`File processing failed: ${error.message}`);
        }
        
        console.log('Edge Function response:', data);
        
        // Check if we have the expected data structure
        if (!data || !data.data) {
          console.error('Invalid response structure from Edge Function:', data);
          throw new Error('Invalid response from the server. Missing data structure.');
        }
        
        // 4. Return the processed data
        return {
          success: true,
          data: data.data.data || data.data, // Handle nested data structure
          file_info: data.data.file_info || { type: 'unknown', filename: file.name },
          requires_review: data.data.requires_review || false,
          missing_fields: data.data.missing_fields || [],
          warnings: data.data.warnings || [],
          fileUrl: publicUrl,
          originalFileName: file.name,
        };
        
      } catch (error) {
        console.error('Error in Carbon Data Agent:', error);
        return {
          success: false,
          message: error.message || 'Unknown error processing file',
          originalFileName: file.name,
        };
      }
    },
    
    /**
     * Correct or complete data after agent processing
     * 
     * @param {Object} data - The data to correct
     * @returns {Promise<Object>} The corrected data
     */
    async correctData(data) {
      try {
        console.log('Correcting data:', data);
        
        // This would typically call an API endpoint to correct the data
        // using the agent's feedback
        const { data: correctedData, error } = await supabase.functions.invoke('process-ai-data', {
          body: {
            operation: 'correct_data',
            data,
            agent: true,
          }
        });
        
        if (error) {
          console.error('Error correcting data:', error);
          throw new Error(`Data correction failed: ${error.message}`);
        }
        
        console.log('Correction response:', correctedData);
        
        return {
          success: true,
          data: correctedData.data || correctedData,
        };
        
      } catch (error) {
        console.error('Error correcting data:', error);
        return {
          success: false,
          message: error.message || 'Unknown error correcting data',
        };
      }
    },
  };
}

export default createCarbonDataAgent; 