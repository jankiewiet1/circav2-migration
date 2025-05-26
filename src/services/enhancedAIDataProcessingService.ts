import { DataEntry, DataEntryInsert, AIFieldMapping, AIDataExtractionResponse } from '@/types/dataEntry';
import { supabase } from '@/integrations/supabase/client';

interface TextractExtractionResult {
  extractedText: string;
  tables: Array<{
    headers: string[];
    rows: string[][];
    confidence: number;
  }>;
  keyValuePairs: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  documentType: 'invoice' | 'receipt' | 'utility_bill' | 'statement' | 'other';
  overallConfidence: number;
}

interface CarbonDataEntry {
  date: string;
  activity_description: string;
  quantity: number;
  unit: string;
  ghg_category: 'Scope 1' | 'Scope 2' | 'Scope 3';
  supplier_vendor?: string;
  cost?: number;
  currency?: string;
  invoice_id?: string;
  confidence: number;
  notes?: string;
}

export class EnhancedAIDataProcessingService {
  constructor() {
    console.log('Enhanced AI Data Processing Service initialized - using Supabase Edge Function');
  }

  /**
   * Enhanced PDF processing using Supabase Edge Function with Textract + GPT-4
   */
  async extractFromPDF(fileUrl: string): Promise<AIDataExtractionResponse> {
    try {
      console.log('Starting enhanced PDF processing via Supabase Edge Function');
      
      // Call the edge function for PDF processing
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_pdf',
          fileUrl: fileUrl,
          enhanced_processing: true
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function failed: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('Edge function returned unsuccessful result:', data);
        throw new Error(data?.message || 'Edge function processing failed');
      }

      console.log('Edge function response:', data);

      // Parse the response data
      let parsedData;
      try {
        parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      } catch (parseError) {
        console.error('Failed to parse edge function response:', parseError);
        throw new Error('Invalid response format from edge function');
      }

      // Transform the edge function response to our expected format
      const carbonEntries = parsedData.entries || [];
      
      // Create field mappings
      const mappings = this.createFieldMappings(carbonEntries);
      
      // Format response
      return {
        success: true,
        message: data.message || `Successfully extracted ${carbonEntries.length} carbon accounting entries`,
        confidence_score: parsedData.extraction_confidence || 0.7,
        mappings,
        extracted_data: carbonEntries.map((entry: any) => ({
          date: entry.date,
          activity_description: entry.activity_description,
          quantity: entry.quantity,
          unit: entry.unit,
          ghg_category: entry.ghg_category,
          supplier_vendor: entry.supplier_vendor,
          cost: entry.cost,
          currency: entry.currency,
          notes: entry.notes,
          source_type: 'pdf',
          ai_processed: true,
          ai_confidence: entry.confidence || 0.7,
        })),
        unmapped_fields: parsedData.warnings || [],
        ambiguous_fields: [],
        requires_user_review: this.requiresUserReview(carbonEntries),
      };
      
    } catch (error) {
      console.error('Enhanced PDF processing failed:', error);
      return {
        success: false,
        message: `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence_score: 0,
        mappings: [],
        extracted_data: [],
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true,
      };
    }
  }

  /**
   * Create field mappings for the extracted data
   */
  private createFieldMappings(carbonData: CarbonDataEntry[]): AIFieldMapping[] {
    if (carbonData.length === 0) {
      return [];
    }

    const sampleEntry = carbonData[0];
    const mappings: AIFieldMapping[] = [];

    Object.keys(sampleEntry).forEach(key => {
      if (key === 'confidence') return; // Skip internal field
      
      mappings.push({
        original_header: key,
        mapped_field: key as keyof DataEntry,
        confidence: 0.95,
        suggestions: [key],
      });
    });

    return mappings;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(carbonData: CarbonDataEntry[]): number {
    if (carbonData.length === 0) return 0;
    
    const totalConfidence = carbonData.reduce((sum, entry) => sum + entry.confidence, 0);
    return totalConfidence / carbonData.length;
  }

  /**
   * Find ambiguous fields that need user review
   */
  private findAmbiguousFields(carbonData: CarbonDataEntry[]): string[] {
    const ambiguous: string[] = [];
    
    carbonData.forEach((entry, index) => {
      if (entry.confidence < 0.7) {
        ambiguous.push(`Entry ${index + 1}: Low confidence (${entry.confidence})`);
      }
      
      if (!entry.ghg_category || !['Scope 1', 'Scope 2', 'Scope 3'].includes(entry.ghg_category)) {
        ambiguous.push(`Entry ${index + 1}: Invalid GHG category`);
      }
      
      if (entry.quantity <= 0) {
        ambiguous.push(`Entry ${index + 1}: Invalid quantity`);
      }
    });
    
    return ambiguous;
  }

  /**
   * Determine if user review is required
   */
  private requiresUserReview(carbonData: CarbonDataEntry[]): boolean {
    if (carbonData.length === 0) return true;
    
    const avgConfidence = this.calculateOverallConfidence(carbonData);
    if (avgConfidence < 0.8) return true;
    
    const hasAmbiguous = this.findAmbiguousFields(carbonData).length > 0;
    return hasAmbiguous;
  }

  /**
   * Transform extracted data to application format
   */
  transformToDataEntries(carbonData: CarbonDataEntry[], companyId: string): DataEntryInsert[] {
    return carbonData.map(entry => ({
      company_id: companyId,
      date: entry.date,
      activity_description: entry.activity_description,
      quantity: entry.quantity,
      unit: entry.unit,
      ghg_category: entry.ghg_category,
      supplier_vendor: entry.supplier_vendor || '',
      cost: entry.cost,
      currency: entry.currency || '',
      notes: entry.notes || '',
      source_type: 'pdf' as const,
      status: 'processed' as const,
      ai_processed: true,
      ai_confidence: entry.confidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  /**
   * Get processing method info
   */
  getProcessingInfo(): { method: string; available: boolean; description: string } {
    return {
      method: 'AWS Textract + GPT-4',
      available: true,
      description: 'Enhanced PDF processing using Supabase Edge Function with Textract + GPT-4'
    };
  }
} 