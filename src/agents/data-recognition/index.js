/**
 * Carbon Data Recognition Agent Wrapper
 * 
 * This module provides a JavaScript interface to the Python-based
 * Carbon Data Recognition Agent with Model Context Protocol (MCP) support.
 */

import { supabase } from '@/integrations/supabase/client';
import { mcpServer } from '@/lib/mcp-server';
import { MCPActionType } from '@/types/mcp';

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
        
        // 3. Process the file using MCP action for document extraction
        try {
          // First try using the MCP action
          console.log('Using MCP action to process file');
          const documentType = this._getDocumentType(file.type);
          
          const result = await mcpServer.executeAction(MCPActionType.EXTRACT_DATA_FROM_DOCUMENT, {
            documentUrl: publicUrl,
            documentType: documentType,
            extractionHints: ['carbon', 'emissions', 'energy']
          });
          
          if (result && result.success) {
            return {
              success: true,
              data: result.extractedEntries[0] || {},
              file_info: { 
                type: documentType, 
                filename: file.name 
              },
              requires_review: result.unmappedFields.length > 0,
              missing_fields: result.unmappedFields,
              warnings: result.warnings,
              fileUrl: publicUrl,
              originalFileName: file.name,
              mcp_processed: true
            };
          }
          
          // If MCP action fails, fall back to Edge Function
          console.log('MCP action failed, falling back to Edge Function');
          throw new Error('MCP action failed');
        } catch (mcpError) {
          console.log('Falling back to Edge Function:', mcpError);
          
          // Fall back to the original Edge Function method
          const { data, error } = await supabase.functions.invoke('process-ai-data', {
            body: {
              operation: 'process_file',
              fileUrl: publicUrl,
              companyId,
              agent: true, // Flag to use the agent-based processing
              useMCP: true  // Flag to use MCP if available
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
        }
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
        
        // Try to use MCP action first
        try {
          if (data.dataEntryId) {
            console.log('Using MCP action to validate data');
            
            const validationFields = Object.entries(data).map(([field, value]) => ({
              field,
              value,
              error: field === 'dataEntryId' ? undefined : null
            }));
            
            const result = await mcpServer.executeAction(MCPActionType.VALIDATE_DATA_ENTRY, {
              dataEntryId: data.dataEntryId,
              validation: validationFields
            });
            
            if (result && result.valid) {
              return {
                success: true,
                data: { ...data, validated: true },
              };
            }
            
            // If validation fails, fall back to Edge Function
            throw new Error('MCP validation failed');
          }
        } catch (mcpError) {
          console.log('Falling back to Edge Function for correction:', mcpError);
        }
        
        // Fall back to Edge Function
        const { data: correctedData, error } = await supabase.functions.invoke('process-ai-data', {
          body: {
            operation: 'correct_data',
            data,
            agent: true,
            useMCP: true // Flag to use MCP if available
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
    
    /**
     * Get document type from MIME type
     * 
     * @private
     * @param {string} mimeType - MIME type of the file
     * @returns {string} Document type for MCP
     */
    _getDocumentType(mimeType) {
      if (mimeType.includes('pdf')) return 'PDF';
      if (mimeType.includes('excel') || mimeType.includes('spreadsheetml')) return 'EXCEL';
      if (mimeType.includes('csv')) return 'CSV';
      if (mimeType.includes('image')) return 'IMAGE';
      return 'PDF'; // Default to PDF
    }
  };
}

export default createCarbonDataAgent; 