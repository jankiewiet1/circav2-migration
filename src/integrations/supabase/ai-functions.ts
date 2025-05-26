import { supabase } from './client';
import { AIDataExtractionResponse, AIFieldMapping } from '@/types/dataEntry';

/**
 * Interface for Supabase edge functions related to AI operations
 */
export const AIFunctions = {
  /**
   * Process a PDF file with GPT-4 Vision
   */
  async extractFromPdf(fileUrl: string, companyId: string): Promise<AIDataExtractionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_pdf',
          fileUrl,
          companyId
        }
      });

      if (error) throw error;

      // Parse the extracted data
      let extractedData = [];
      try {
        const content = data.data;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/\{[\s\S]*\}/);
                         
        if (jsonMatch) {
          const jsonData = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonData);
          
          // Handle both array and single object formats
          extractedData = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (e) {
        console.error('Error parsing PDF extraction result:', e);
        extractedData = [];
      }

      return {
        success: data.success,
        message: data.message,
        confidence_score: data.confidence_score,
        mappings: [],
        extracted_data: extractedData,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true
      };
    } catch (error) {
      console.error('Error calling PDF extraction edge function:', error);
      return {
        success: false,
        message: error.message || 'Failed to process PDF',
        confidence_score: 0,
        mappings: [],
        extracted_data: [],
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true
      };
    }
  },

  /**
   * Map CSV headers to data model fields
   */
  async mapCsvHeaders(csvData: string, companyId: string): Promise<AIFieldMapping[]> {
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'map_csv_headers',
          csvData,
          companyId
        }
      });

      if (error) throw error;

      return data.mappings || [];
    } catch (error) {
      console.error('Error calling CSV mapping edge function:', error);
      // Return empty array on error
      return [];
    }
  },

  /**
   * Analyze data for insights
   */
  async analyzeData(csvData: string, companyId: string): Promise<{ insights: string; confidence: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'analyze_data',
          csvData,
          companyId
        }
      });

      if (error) throw error;

      return {
        insights: data.insights || 'No insights available',
        confidence: data.confidence_score || 0
      };
    } catch (error) {
      console.error('Error calling data analysis edge function:', error);
      return {
        insights: 'Error analyzing data',
        confidence: 0
      };
    }
  },

  /**
   * Check edge function health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('process-ai-data', {
        body: { operation: 'health_check' }
      });

      return !error;
    } catch (error) {
      console.error('Edge function health check failed:', error);
      return false;
    }
  }
}; 