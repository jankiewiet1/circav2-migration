import { DataEntry, DataEntryInsert, AIFieldMapping, AIDataExtractionResponse } from '@/types/dataEntry';
import { supabase } from '@/integrations/supabase/client';
import { openai, isConfigured } from '@/integrations/openai/client';

interface EnhancedExtractionResult {
  document_type: 'utility_bill' | 'fuel_receipt' | 'travel_expense' | 'purchase_invoice' | 'other';
  extraction_confidence: number;
  entries: Array<{
    date: string;
    activity_description: string;
    quantity: number;
    unit: string;
    ghg_category: 'Scope 1' | 'Scope 2' | 'Scope 3';
    supplier_vendor?: string;
    cost?: number;
    currency?: string;
    invoice_id?: string;
    field_confidence: {
      [key: string]: number;
    };
    notes?: string;
  }>;
  warnings: string[];
  suggestions: string[];
}

/**
 * Enhanced AI-powered data extraction and processing service
 * Implements multi-stage processing for better accuracy
 */
export const AIDataProcessingService = {
  /**
   * Stage 1: Document Classification and Initial Extraction
   */
  async classifyAndExtract(content: string, fileType: string): Promise<EnhancedExtractionResult> {
    if (!isConfigured) {
      throw new Error('OpenAI is not configured');
    }

    const classificationPrompt = `
You are a specialized Carbon Accounting Document Classifier and Data Extractor.

STAGE 1: DOCUMENT CLASSIFICATION
First, analyze this ${fileType} content and classify the document type:
- utility_bill: Electricity, gas, water, heating bills
- fuel_receipt: Gasoline, diesel, fuel purchases
- travel_expense: Business travel, flights, accommodation
- purchase_invoice: Materials, equipment, services
- other: Documents that don't fit above categories

STAGE 2: CARBON DATA EXTRACTION
Extract ALL emission-related activities as separate entries. For each entry, identify:

REQUIRED FIELDS:
- date: Activity/consumption date (YYYY-MM-DD format)
- activity_description: Clear description of emission activity
- quantity: Numeric amount (energy, fuel, distance, etc.)
- unit: Measurement unit (kWh, liters, km, kg, m³, etc.)
- ghg_category: Scope classification based on GHG Protocol:
  * "Scope 1": Direct emissions (fuel combustion, company vehicles, natural gas)
  * "Scope 2": Indirect energy (purchased electricity, heating, cooling)
  * "Scope 3": Other indirect (business travel, purchased materials, waste)

OPTIONAL FIELDS:
- supplier_vendor: Service provider name
- cost: Monetary amount
- currency: Currency code (USD, EUR, etc.)
- invoice_id: Reference number
- notes: Additional context

CONFIDENCE SCORING (0.0-1.0):
Rate each field's confidence:
- 0.9-1.0: Directly visible and clearly labeled
- 0.7-0.8: Derived from context or calculations  
- 0.5-0.6: Inferred from patterns
- 0.3-0.4: Estimated from standards
- 0.0-0.2: Missing or highly uncertain

Return JSON format:
{
  "document_type": "utility_bill",
  "extraction_confidence": 0.85,
  "entries": [...],
  "warnings": [...],
  "suggestions": [...]
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: classificationPrompt },
          { role: 'user', content: `Analyze and extract carbon accounting data from this ${fileType} content:\n\n${content}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 3000
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return result as EnhancedExtractionResult;
    } catch (error) {
      console.error('Error in document classification and extraction:', error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Stage 2: Data Validation and Enhancement
   */
  async validateAndEnhance(extractedData: EnhancedExtractionResult): Promise<EnhancedExtractionResult> {
    if (!isConfigured) {
      throw new Error('OpenAI is not configured');
    }

    const validationPrompt = `
You are a Carbon Accounting Data Validator and Quality Assurance Expert.

VALIDATION TASKS:
1. VERIFY SCOPE CLASSIFICATION: Ensure GHG categories follow the Greenhouse Gas Protocol
2. VALIDATE UNITS: Check units are appropriate for activity types
3. CHECK DATA CONSISTENCY: Verify dates, amounts, and relationships make sense
4. ENHANCE DESCRIPTIONS: Improve activity descriptions for clarity
5. QUALITY ASSURANCE: Flag potential issues and suggest improvements

SCOPE CLASSIFICATION RULES:
- Scope 1: Direct emissions from company-owned sources (fuel combustion, company vehicles, facility heating)
- Scope 2: Indirect emissions from purchased energy (electricity, steam, heating/cooling)
- Scope 3: All other indirect emissions (business travel, purchased goods, waste, commuting)

COMMON VALIDATION CHECKS:
- Energy consumption should use kWh, MWh, therms, m³
- Fuel consumption should use liters, gallons, kg
- Travel should use km, miles, or passenger-km
- Dates should be recent and logical
- Costs should align with quantities

Return the ENHANCED data with:
- Corrected scope classifications
- Improved activity descriptions
- Validated units and amounts
- Updated confidence scores
- Additional warnings for review
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: validationPrompt },
          { role: 'user', content: `Validate and enhance this extracted carbon data:\n\n${JSON.stringify(extractedData, null, 2)}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 3000
      });

      const enhanced = JSON.parse(completion.choices[0].message.content || '{}');
      return enhanced as EnhancedExtractionResult;
    } catch (error) {
      console.error('Error in data validation and enhancement:', error);
      // Return original data if validation fails
      return extractedData;
    }
  },

  /**
   * Stage 3: Convert to Application Format
   */
  async convertToApplicationFormat(
    enhancedData: EnhancedExtractionResult, 
    companyId: string, 
    userId: string
  ): Promise<AIDataExtractionResponse> {
    // Map enhanced extraction to application format
    const mappings: AIFieldMapping[] = [
      {
        original_header: 'date',
        mapped_field: 'date',
        confidence: 0.95,
        suggestions: ['date', 'activity_date', 'consumption_date']
      },
      {
        original_header: 'activity_description',
        mapped_field: 'activity_description',
        confidence: 0.95,
        suggestions: ['description', 'activity', 'service']
      },
      {
        original_header: 'quantity',
        mapped_field: 'quantity',
        confidence: 0.95,
        suggestions: ['amount', 'volume', 'consumption']
      },
      {
        original_header: 'unit',
        mapped_field: 'unit',
        confidence: 0.95,
        suggestions: ['measurement', 'units', 'uom']
      },
      {
        original_header: 'ghg_category',
        mapped_field: 'ghg_category',
        confidence: 0.90,
        suggestions: ['scope', 'category', 'emission_type']
      }
    ];

    // Convert entries to data entry format
    const extracted_data: Partial<DataEntry>[] = enhancedData.entries.map(entry => ({
      company_id: companyId,
      created_by: userId,
      date: entry.date,
      activity_description: entry.activity_description,
      quantity: entry.quantity,
      unit: entry.unit,
      ghg_category: entry.ghg_category,
      supplier_vendor: entry.supplier_vendor,
      cost: entry.cost,
      currency: entry.currency,
      notes: entry.notes,
      source_type: 'manual entry' as const,
      status: 'validated' as const,
      ai_processed: true,
      ai_confidence: entry.field_confidence ? 
        (Object.values(entry.field_confidence).reduce((sum: number, conf: number) => sum + conf, 0) as number) / Object.keys(entry.field_confidence).length :
        0.8,
      ai_notes: `Document type: ${enhancedData.document_type}, Overall confidence: ${enhancedData.extraction_confidence}`
    }));

    // Determine if user review is required
    const avgConfidence = enhancedData.extraction_confidence;
    const hasLowConfidenceFields = enhancedData.entries.some(entry =>
      Object.values(entry.field_confidence).some(conf => conf < 0.7)
    );
    const requires_user_review = avgConfidence < 0.8 || hasLowConfidenceFields || enhancedData.warnings.length > 0;

    return {
      success: true,
      message: `Successfully extracted ${enhancedData.entries.length} carbon accounting entries from ${enhancedData.document_type}`,
      mappings,
      extracted_data,
      confidence_score: avgConfidence,
      unmapped_fields: enhancedData.warnings,
      ambiguous_fields: enhancedData.entries
        .filter(entry => Object.values(entry.field_confidence).some(conf => conf < 0.7))
        .map(entry => ({
          original_header: entry.activity_description,
          mapped_field: 'activity_description' as keyof DataEntry,
          confidence: Math.min(...Object.values(entry.field_confidence)),
          suggestions: []
        })),
      requires_user_review
    };
  },

  /**
   * Enhanced PDF Processing with real PDF libraries and batch support
   */
  async extractFromPdf(fileUrl: string): Promise<AIDataExtractionResponse> {
    try {
      console.log('Processing PDF with real extraction libraries:', fileUrl);
      
      // Call the enhanced Supabase Edge Function with real PDF processing
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_pdf',
          fileUrl: fileUrl,
          enhanced_processing: true // Flag for real PDF libraries
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }
      
      console.log('Real PDF extraction response:', data);
      
      // Transform the Edge Function response to AIDataExtractionResponse format
      if (!data?.success) {
        throw new Error(data?.message || 'Real PDF processing failed');
      }
      
      // Parse the structured response from real PDF extraction
      let extractedEntries: Partial<DataEntry>[] = [];
      let confidence = 0.7;
      let documentType = 'other';
      let warnings: string[] = [];
      let suggestions: string[] = [];
      
      try {
        const content = data.data || '';
        console.log('Real extraction content length:', content.length);
        
        // Parse the structured JSON response from enhanced Edge Function
        const parsed = JSON.parse(content);
        console.log('Parsed real extraction response:', { 
          hasEntries: !!parsed.entries, 
          entriesLength: parsed.entries?.length,
          documentType: parsed.document_type,
          confidence: parsed.extraction_confidence,
          extractionMethod: parsed.metadata?.extractionMethod
        });
        
        if (parsed.entries && Array.isArray(parsed.entries)) {
          // Enhanced structured format from real PDF processing
          extractedEntries = parsed.entries.map((entry: any) => ({
            date: entry.date || new Date().toISOString().split('T')[0],
            activity_description: entry.activity_description || 'Unknown activity',
            quantity: parseFloat(entry.quantity) || 0,
            unit: entry.unit || 'units',
            ghg_category: entry.ghg_category || entry.ghg_scope || 'Scope 3',
            supplier_vendor: entry.supplier_vendor || '',
            cost: entry.cost ? parseFloat(entry.cost) : undefined,
            currency: entry.currency || '',
            notes: entry.notes || (entry.invoice_id ? `Invoice: ${entry.invoice_id}` : ''),
            source_type: 'pdf',
            ai_processed: true,
            ai_confidence: entry.field_confidence ? 
              (Object.values(entry.field_confidence).reduce((sum: number, conf: number) => sum + conf, 0) as number) / Object.keys(entry.field_confidence).length :
              (entry.confidence_score || 0.8)
          }));
          
          confidence = parsed.extraction_confidence || 0.8;
          documentType = parsed.document_type || 'other';
          warnings = parsed.warnings || [];
          suggestions = parsed.suggestions || [];
        } else {
          throw new Error('No entries found in real extraction response');
        }
      } catch (parseError) {
        console.error('Error parsing real extraction response:', parseError);
        console.log('Using enhanced fallback data');
        
        // Create enhanced fallback entry with better defaults
        const filename = fileUrl.split('/').pop() || 'document.pdf';
        extractedEntries = [{
          date: new Date().toISOString().split('T')[0],
          activity_description: filename.toLowerCase().includes('fuel') ? 'Fuel purchase (processing error)' : 
                               filename.toLowerCase().includes('electric') ? 'Electricity consumption (processing error)' :
                               filename.toLowerCase().includes('travel') ? 'Business travel (processing error)' :
                               'Emission activity (processing error)',
          quantity: 0,
          unit: 'units',
          ghg_category: 'Scope 3',
          supplier_vendor: 'Unknown - Review Required',
          source_type: 'pdf',
          ai_processed: true,
          ai_confidence: 0.3,
          notes: `Real extraction failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        }];
        warnings = ['Real PDF extraction failed - manual review required'];
        suggestions = ['Verify document quality', 'Check PDF format', 'Try uploading again'];
      }
      
      console.log(`Real extraction completed: ${extractedEntries.length} entries`);
      
      // Create mappings based on successfully extracted fields
      const mappings: AIFieldMapping[] = [
        { original_header: 'date', mapped_field: 'date', confidence: 0.95 },
        { original_header: 'activity_description', mapped_field: 'activity_description', confidence: 0.90 },
        { original_header: 'quantity', mapped_field: 'quantity', confidence: 0.85 },
        { original_header: 'unit', mapped_field: 'unit', confidence: 0.85 },
        { original_header: 'ghg_category', mapped_field: 'ghg_category', confidence: 0.80 },
        { original_header: 'supplier_vendor', mapped_field: 'supplier_vendor', confidence: 0.75 }
      ];
      
      // Determine if user review is required
      const requiresReview = confidence < 0.8 || 
                            extractedEntries.length === 0 || 
                            warnings.length > 0 ||
                            extractedEntries.some(entry => (entry.ai_confidence || 0) < 0.7);
      
      return {
        success: true,
        message: `Successfully extracted ${extractedEntries.length} entries using real PDF processing (${documentType})`,
        mappings,
        extracted_data: extractedEntries,
        confidence_score: confidence,
        unmapped_fields: warnings,
        ambiguous_fields: mappings.filter(m => m.confidence < 0.8),
        requires_user_review: requiresReview
      };
      
    } catch (error) {
      console.error('Real PDF extraction failed:', error);
      
      return {
        success: false,
        message: `Real PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        mappings: [],
        extracted_data: [],
        confidence_score: 0,
        unmapped_fields: ['Real PDF extraction failed completely'],
        ambiguous_fields: [],
        requires_user_review: true
      };
    }
  },

  /**
   * Batch processing for thousands of files
   */
  async processBatch(
    fileUrls: string[], 
    companyId: string = 'global',
    batchId?: string,
    onProgress?: (completed: number, total: number, currentFile?: string) => void
  ): Promise<{
    batchId: string;
    results: AIDataExtractionResponse[];
    summary: {
      totalFiles: number;
      successful: number;
      failed: number;
      totalEntries: number;
      overallConfidence: number;
    }
  }> {
    try {
      console.log(`Starting batch processing of ${fileUrls.length} files`);
      
      // Call the enhanced Supabase Edge Function for batch processing
      const actualBatchId = batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'batch_process',
          fileUrls: fileUrls,
          companyId: companyId,
          batchId: actualBatchId
        }
      });

      if (error) {
        console.error('Batch processing error:', error);
        throw error;
      }
      
      if (!data?.success) {
        throw new Error(data?.message || 'Batch processing failed');
      }
      
      console.log('Batch processing completed:', data);
      
      // Transform batch results to individual responses
      const batchResults = data.data || {};
      const results: AIDataExtractionResponse[] = [];
      let totalEntries = 0;
      let totalConfidence = 0;
      let successful = 0;
      let failed = 0;
      
      // Process each job result
      if (batchResults.results && Array.isArray(batchResults.results)) {
        for (const job of batchResults.results) {
          if (onProgress) {
            onProgress(results.length + 1, fileUrls.length, job.fileUrl);
          }
          
          if (job.status === 'completed' && job.result) {
            try {
              // Parse the individual result
              const parsed = JSON.parse(job.result);
              const entries = parsed.entries || [];
              
              const response: AIDataExtractionResponse = {
                success: true,
                message: `Processed ${entries.length} entries from ${job.fileUrl.split('/').pop()}`,
                mappings: [
                  { original_header: 'date', mapped_field: 'date', confidence: 0.9 },
                  { original_header: 'activity_description', mapped_field: 'activity_description', confidence: 0.85 },
                  { original_header: 'quantity', mapped_field: 'quantity', confidence: 0.8 }
                ],
                extracted_data: entries.map((entry: any) => ({
                  date: entry.date,
                  activity_description: entry.activity_description,
                  quantity: entry.quantity,
                  unit: entry.unit,
                  ghg_category: entry.ghg_category,
                  supplier_vendor: entry.supplier_vendor,
                  cost: entry.cost,
                  currency: entry.currency,
                  source_type: 'pdf',
                  ai_processed: true,
                  ai_confidence: entry.field_confidence ? 
                    Object.values(entry.field_confidence).reduce((sum: number, conf: number) => sum + conf, 0) / Object.keys(entry.field_confidence).length :
                    0.8
                })),
                confidence_score: parsed.extraction_confidence || 0.8,
                unmapped_fields: parsed.warnings || [],
                ambiguous_fields: [],
                requires_user_review: entries.length === 0 || (parsed.extraction_confidence || 0.8) < 0.7
              };
              
              results.push(response);
              totalEntries += entries.length;
              totalConfidence += parsed.extraction_confidence || 0.8;
              successful++;
              
            } catch (parseError) {
              console.error(`Error parsing result for ${job.fileUrl}:`, parseError);
              
              const errorResponse: AIDataExtractionResponse = {
                success: false,
                message: `Failed to parse result for ${job.fileUrl.split('/').pop()}`,
                mappings: [],
                extracted_data: [],
                confidence_score: 0,
                unmapped_fields: ['Parse error in batch processing'],
                ambiguous_fields: [],
                requires_user_review: true
              };
              
              results.push(errorResponse);
              failed++;
            }
          } else {
            // Job failed
            const errorResponse: AIDataExtractionResponse = {
              success: false,
              message: `Failed to process ${job.fileUrl.split('/').pop()}: ${job.error || 'Unknown error'}`,
              mappings: [],
              extracted_data: [],
              confidence_score: 0,
              unmapped_fields: [job.error || 'Processing failed'],
              ambiguous_fields: [],
              requires_user_review: true
            };
            
            results.push(errorResponse);
            failed++;
          }
        }
      }
      
      const summary = {
        totalFiles: fileUrls.length,
        successful,
        failed,
        totalEntries,
        overallConfidence: successful > 0 ? totalConfidence / successful : 0
      };
      
      console.log('Batch processing summary:', summary);
      
      return {
        batchId: actualBatchId,
        results,
        summary
      };
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw new Error(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Process any text content with multi-stage approach
   */
  async processTextContent(content: string, fileType: string, companyId: string, userId: string): Promise<AIDataExtractionResponse> {
    try {
      // Stage 1: Classification and Extraction
      const initialExtraction = await this.classifyAndExtract(content, fileType);
      
      // Stage 2: Validation and Enhancement
      const enhancedData = await this.validateAndEnhance(initialExtraction);
      
      // Stage 3: Convert to Application Format
      const result = await this.convertToApplicationFormat(enhancedData, companyId, userId);
      
      return result;
    } catch (error) {
      console.error('Multi-stage processing failed:', error);
      throw new Error(`Content processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Extract structured data from a CSV file
   */
  async extractFromCsv(file: File): Promise<AIDataExtractionResponse> {
    try {
      // Parse the CSV client-side using FileReader
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          const csvContent = event.target?.result as string;
          if (!csvContent) {
            reject(new Error('Failed to read CSV file'));
            return;
          }
          
          // Parse CSV content
          const lines = csvContent.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          // Map headers to DataEntry fields using AI
          const mappings = await this.mapHeadersToDataEntryFields(headers);
          
          // Extract data rows
          const extractedData: Partial<DataEntry>[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Skip empty lines
            
            const values = lines[i].split(',').map(v => v.trim());
            const rowData: Partial<DataEntry> = {};
            
            // Apply mappings to populate rowData
            mappings.forEach((mapping, index) => {
              if (mapping.mapped_field && index < values.length) {
                // @ts-ignore: Dynamic property assignment
                rowData[mapping.mapped_field] = values[index];
              }
            });
            
            extractedData.push(rowData);
          }
          
          // Identify fields requiring user attention
          const unmappedFields = headers.filter(header => 
            !mappings.some(m => m.original_header === header && m.mapped_field)
          );
          
          const ambiguousFields = mappings.filter(m => m.confidence < 0.7 && m.mapped_field);
          
          // Prepare response
          const response: AIDataExtractionResponse = {
            success: true,
            message: `Extracted ${extractedData.length} rows from CSV`,
            mappings,
            extracted_data: extractedData,
            confidence_score: this.calculateOverallConfidence(mappings),
            unmapped_fields: unmappedFields,
            ambiguous_fields: ambiguousFields,
            requires_user_review: unmappedFields.length > 0 || ambiguousFields.length > 0
          };
          
          resolve(response);
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading CSV file'));
        };
        
        reader.readAsText(file);
      });
    } catch (error) {
      console.error('Error extracting data from CSV:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing CSV',
        mappings: [],
        extracted_data: [],
        confidence_score: 0,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true
      };
    }
  },
  
  /**
   * Helper to parse numbers safely
   */
  parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal point and negative sign
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  },
  
  /**
   * Helper to extract year from date string
   */
  getYear(dateStr?: string): number | undefined {
    if (!dateStr) return undefined;
    
    // Try to extract year from ISO format date (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-/);
    if (isoMatch) return parseInt(isoMatch[1], 10);
    
    // Try to extract from MM/DD/YYYY format
    const usMatch = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
    if (usMatch) return parseInt(usMatch[1], 10);
    
    // Try to extract from DD/MM/YYYY format
    const euMatch = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
    if (euMatch) return parseInt(euMatch[1], 10);
    
    // Try to extract any 4-digit year from the string
    const yearMatch = dateStr.match(/\b(20\d{2})\b/);
    if (yearMatch) return parseInt(yearMatch[1], 10);
    
    return undefined;
  },
  
  /**
   * Map extracted data to emission entries
   */
  mapExtractedDataToEmissionEntries(extractedData: any[]): any[] {
    try {
      return extractedData.map(item => {
        // Create a mapping between the extracted fields and our database schema
        return {
          // Map the most common field names from extraction to our schema
          date: item.date || new Date().toISOString().split('T')[0],
          type: item.type || item.source_type || item.activity_description || 'unknown',
          region: item.region || item.location || 'unknown',
          amount: this.parseNumeric(item.amount || item.quantity || 0),
          amount_unit: item.amount_unit || item.unit || 'unknown',
          year: this.extractYear(item.date) || item.year || new Date().getFullYear(),
          supplier: item.supplier || item.supplier_vendor || 'unknown',
          energy_source: item.energy_source || this.inferEnergySource(item.type || item.source_type || ''),
          connection_type: item.connection_type || 'unknown',
          loss_factor: this.parseNumeric(item.loss_factor || 0),
          recs: item.recs || 'unknown',
          invoice_id: item.invoice_id || item.invoice_number || 'unknown',
          description: item.description || item.notes || item.activity_description || 'Extracted from PDF'
        };
      });
    } catch (error) {
      console.error('Error mapping extracted data:', error);
      return [];
    }
  },
  
  /**
   * Generate field mappings based on extracted data
   */
  generateFieldMappings(extractedData: any[]): Record<string, string> {
    if (!extractedData || extractedData.length === 0) {
      return {};
    }
    
    try {
      // Extract all keys from the first item
      const sampleItem = extractedData[0];
      const mappings: Record<string, string> = {};
      
      // Create a mapping for each field
      for (const key in sampleItem) {
        // Map common field names to our schema
        if (key === 'date') mappings[key] = 'date';
        else if (['type', 'source_type', 'activity_type'].includes(key)) mappings[key] = 'type';
        else if (['region', 'location'].includes(key)) mappings[key] = 'region';
        else if (['amount', 'quantity', 'value'].includes(key)) mappings[key] = 'amount';
        else if (['amount_unit', 'unit', 'units'].includes(key)) mappings[key] = 'amount_unit';
        else if (key === 'year') mappings[key] = 'year';
        else if (['supplier', 'supplier_vendor', 'vendor'].includes(key)) mappings[key] = 'supplier';
        else if (['energy_source', 'source'].includes(key)) mappings[key] = 'energy_source';
        else if (['connection_type', 'connection'].includes(key)) mappings[key] = 'connection_type';
        else if (['loss_factor', 'loss'].includes(key)) mappings[key] = 'loss_factor';
        else if (key === 'recs') mappings[key] = 'recs';
        else if (['invoice_id', 'invoice_number', 'invoice'].includes(key)) mappings[key] = 'invoice_id';
        else if (['description', 'notes', 'activity_description'].includes(key)) mappings[key] = 'description';
        else mappings[key] = 'unmapped';
      }
      
      return mappings;
    } catch (error) {
      console.error('Error generating field mappings:', error);
      return {};
    }
  },
  
  /**
   * Parse numeric values safely
   */
  parseNumeric(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove any non-numeric characters except decimal point
      const cleaned = value.replace(/[^\d.-]/g, '');
      return Number(cleaned) || 0;
    }
    return 0;
  },
  
  /**
   * Extract year from date string
   */
  extractYear(dateStr?: string): number | undefined {
    if (!dateStr) return undefined;
    
    // Try to extract year from ISO format date
    const match = dateStr.match(/^(\d{4})-/);
    if (match) return Number(match[1]);
    
    return undefined;
  },
  
  /**
   * Infer energy source from type
   */
  inferEnergySource(type: string): string {
    type = type.toLowerCase();
    
    if (type.includes('electric')) return 'electricity';
    if (type.includes('gas')) return 'natural gas';
    if (type.includes('fuel') || type.includes('diesel') || type.includes('petrol')) return 'fossil fuel';
    if (type.includes('renew')) return 'renewable';
    if (type.includes('solar')) return 'solar';
    if (type.includes('wind')) return 'wind';
    
    return 'unknown';
  },
  
  /**
   * Map CSV headers to DataEntry fields using GPT-4
   */
  async mapHeadersToDataEntryFields(headers: string[]): Promise<AIFieldMapping[]> {
    // Check if fallback should be used
    if (headers.length === 0) {
      return [];
    }
    
    try {
      console.log('Mapping headers using Supabase Edge Function:', headers);
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'map_headers',
          headers
        }
      });

      if (error) {
        console.error('Error calling process-ai-data edge function for header mapping:', error);
        return this.fallbackHeaderMapping(headers);
      }

      if (!data?.success) {
        console.warn('Edge function returned error:', data?.message);
        return this.fallbackHeaderMapping(headers);
      }

      // Process the response from the edge function
      const content = data.data || '';
      
      try {
        const parsed = JSON.parse(content);
        
        if (Array.isArray(parsed.mappings)) {
          return parsed.mappings as AIFieldMapping[];
        } else if (Array.isArray(parsed)) {
          return parsed as AIFieldMapping[];
        } else {
          // Fallback if format is incorrect
          console.warn('Unexpected response format from edge function, using fallback mapping');
          return this.fallbackHeaderMapping(headers);
        }
      } catch (e) {
        console.error('Error parsing response from edge function for header mapping:', e);
        return this.fallbackHeaderMapping(headers);
      }
    } catch (error) {
      console.error('Error mapping headers:', error);
      return this.fallbackHeaderMapping(headers);
    }
  },
  
  /**
   * Fallback mapping method when AI is unavailable
   */
  fallbackHeaderMapping(headers: string[]): AIFieldMapping[] {
    // Common field mappings with confidence scores
    const commonMappings: Record<string, {field: keyof DataEntry, confidence: number}> = {
      'date': { field: 'date', confidence: 0.95 },
      'activity date': { field: 'date', confidence: 0.9 },
      'description': { field: 'activity_description', confidence: 0.9 },
      'activity': { field: 'activity_description', confidence: 0.85 },
      'activity description': { field: 'activity_description', confidence: 0.95 },
      'quantity': { field: 'quantity', confidence: 0.95 },
      'amount': { field: 'quantity', confidence: 0.8 },
      'value': { field: 'quantity', confidence: 0.75 },
      'unit': { field: 'unit', confidence: 0.95 },
      'units': { field: 'unit', confidence: 0.9 },
      'uom': { field: 'unit', confidence: 0.85 },
      'scope': { field: 'ghg_category', confidence: 0.9 },
      'ghg scope': { field: 'ghg_category', confidence: 0.95 },
      'category': { field: 'ghg_category', confidence: 0.8 },
      'supplier': { field: 'supplier_vendor', confidence: 0.9 },
      'vendor': { field: 'supplier_vendor', confidence: 0.9 },
      'source': { field: 'source_type', confidence: 0.85 },
      'source type': { field: 'source_type', confidence: 0.95 },
      'cost': { field: 'cost', confidence: 0.95 },
      'price': { field: 'cost', confidence: 0.8 },
      'currency': { field: 'currency', confidence: 0.95 },
      'notes': { field: 'notes', confidence: 0.95 },
      'comments': { field: 'notes', confidence: 0.85 },
    };
    
    return headers.map(header => {
      const lowerHeader = header.toLowerCase();
      const mapping = commonMappings[lowerHeader];
      
      if (mapping) {
        return {
          original_header: header,
          mapped_field: mapping.field,
          confidence: mapping.confidence,
        };
      }
      
      // If no direct match, try fuzzy matching (simplified)
      for (const [key, value] of Object.entries(commonMappings)) {
        if (lowerHeader.includes(key) || key.includes(lowerHeader)) {
          return {
            original_header: header,
            mapped_field: value.field,
            confidence: value.confidence * 0.7, // Reduce confidence for partial matches
            suggestions: [value.field.toString()]
          };
        }
      }
      
      // No match found
      return {
        original_header: header,
        mapped_field: 'notes' as keyof DataEntry, // Default to notes
        confidence: 0.3,
        suggestions: ['activity_description', 'notes', 'custom_tags']
      };
    });
  },
  
  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(mappings: AIFieldMapping[]): number {
    if (mappings.length === 0) return 0;
    
    const sum = mappings.reduce((total, mapping) => total + mapping.confidence, 0);
    return sum / mappings.length;
  },
  
  /**
   * Apply user corrections to AI mappings
   */
  applyUserCorrections(
    originalMappings: AIFieldMapping[],
    corrections: {originalHeader: string; correctedField: keyof DataEntry}[]
  ): AIFieldMapping[] {
    return originalMappings.map(mapping => {
      const correction = corrections.find(c => c.originalHeader === mapping.original_header);
      
      if (correction) {
        return {
          ...mapping,
          mapped_field: correction.correctedField,
          confidence: 1.0, // User-corrected mappings have 100% confidence
        };
      }
      
      return mapping;
    });
  },
  
  /**
   * Transform extracted data using mappings
   */
  transformExtractedData(
    rawData: any[],
    mappings: AIFieldMapping[],
    companyId: string
  ): DataEntryInsert[] {
    // Fix for missing mappings: ensure mappings is an array and has content
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      console.log('No mappings provided, generating default mappings based on data');
      // Generate default mappings from the first data item's keys
      if (rawData && rawData.length > 0) {
        const firstItem = rawData[0];
        mappings = Object.keys(firstItem).map(key => {
          // Try to infer the field type based on common naming patterns
          let mappedField: keyof DataEntry = 'notes'; // Default
          
          const normalizedKey = key.toLowerCase();
          
          // Apply simple mapping rules
          if (normalizedKey.includes('date')) mappedField = 'date';
          else if (normalizedKey.includes('type') || normalizedKey.includes('source')) mappedField = 'source_type';
          else if (normalizedKey.includes('desc') || normalizedKey.includes('activity')) mappedField = 'activity_description';
          else if (normalizedKey.includes('quant') || normalizedKey.includes('amount')) mappedField = 'quantity';
          else if (normalizedKey.includes('unit')) mappedField = 'unit';
          else if (normalizedKey.includes('scope') || normalizedKey.includes('category') || normalizedKey.includes('ghg')) mappedField = 'ghg_category';
          else if (normalizedKey.includes('supplier') || normalizedKey.includes('vendor')) mappedField = 'supplier_vendor';
          
          return {
            original_header: key,
            mapped_field: mappedField,
            confidence: 0.6 // Medium confidence for auto-mapping
          };
        });
        
        console.log('Generated default mappings:', mappings);
      }
    }
    
    return rawData.map(row => {
      const entry: DataEntryInsert = {
        company_id: companyId,
        date: new Date().toISOString().split('T')[0], // Default to today
        source_type: 'manual entry' as const,
        activity_description: 'Unknown activity',
        quantity: 0,
        unit: 'units',
        ghg_category: 'Scope 3',
        status: 'validated' as const,
        ai_processed: true,
      };
      
      // Apply mappings to populate the entry
      for (const [key, value] of Object.entries(row)) {
        // Safe handling for missing mappings
        const mapping = mappings?.find?.(m => m.original_header === key);
        
        if (mapping && mapping.mapped_field) {
          try {
            // Convert types appropriately
            if (mapping.mapped_field === 'quantity') {
              // @ts-ignore
              entry[mapping.mapped_field] = parseFloat(value) || 0;
            } else if (mapping.mapped_field === 'date') {
              // @ts-ignore
              entry[mapping.mapped_field] = this.formatDate(value);
            } else if (mapping.mapped_field === 'ghg_category') {
              // Handle scope formatting
              // @ts-ignore
              entry[mapping.mapped_field] = this.formatGhgCategory(value);
            } else {
              // @ts-ignore
              entry[mapping.mapped_field] = value;
            }
          } catch (error) {
            console.error(`Error mapping field ${key} to ${mapping.mapped_field}:`, error);
            // Continue with other fields instead of breaking
          }
        } else {
          // If no mapping found, try to infer the field based on its name
          this.applyDirectMapping(entry, key, value);
        }
      }
      
      // Track AI confidence
      entry.ai_confidence = 0.8;
      
      return entry;
    });
  },
  
  /**
   * Apply direct mapping based on field name when no mapping is available
   */
  applyDirectMapping(entry: DataEntryInsert, key: string, value: any): void {
    // Normalize the key for comparison
    const normalizedKey = key.toLowerCase();
    
    try {
      // Apply simple direct mapping rules
      if (normalizedKey.includes('date')) {
        entry.date = this.formatDate(value);
      } else if (normalizedKey.includes('type') || normalizedKey.includes('source')) {
        // Ensure it's a valid source type
        const sourceValue = String(value).toLowerCase();
        
        // Map to valid source types
        if (sourceValue.includes('csv')) {
          entry.source_type = 'csv';
        } else if (sourceValue.includes('excel') || sourceValue.includes('xlsx')) {
          entry.source_type = 'excel'; 
        } else if (sourceValue.includes('pdf')) {
          entry.source_type = 'pdf';
        } else if (sourceValue.includes('api')) {
          entry.source_type = 'API';
        } else if (sourceValue.includes('invoice')) {
          entry.source_type = 'invoice';
        } else if (sourceValue.includes('manual')) {
          entry.source_type = 'manual entry';
        } else {
          // Default if not recognized
          entry.source_type = 'manual entry';
        }
      } else if (normalizedKey.includes('desc') || normalizedKey.includes('activity')) {
        entry.activity_description = String(value);
      } else if (normalizedKey.includes('quant') || normalizedKey.includes('amount')) {
        entry.quantity = this.parseNumber(value);
      } else if (normalizedKey.includes('unit')) {
        entry.unit = String(value);
      } else if (normalizedKey.includes('scope') || normalizedKey.includes('category') || normalizedKey.includes('ghg')) {
        entry.ghg_category = this.formatGhgCategory(value);
      } else if (normalizedKey.includes('supplier') || normalizedKey.includes('vendor')) {
        entry.supplier_vendor = String(value);
      }
    } catch (error) {
      console.error(`Error applying direct mapping for field ${key}:`, error);
    }
  },
  
  /**
   * Format date values consistently
   */
  formatDate(dateValue: string): string {
    try {
      const date = new Date(dateValue);
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0]; // Default to today
      }
      
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      return new Date().toISOString().split('T')[0]; // Default to today
    }
  },
  
  /**
   * Format GHG category consistently
   */
  formatGhgCategory(value: string): 'Scope 1' | 'Scope 2' | 'Scope 3' {
    const normalized = value.toString().toLowerCase().trim();
    
    if (normalized.includes('1') || normalized.includes('one') || normalized === 'scope1') {
      return 'Scope 1';
    } else if (normalized.includes('2') || normalized.includes('two') || normalized === 'scope2') {
      return 'Scope 2';
    } else {
      return 'Scope 3'; // Default to Scope 3
    }
  },
  
  /**
   * Extract structured data from an Excel file
   */
  async extractFromExcel(fileUrl: string): Promise<AIDataExtractionResponse> {
    try {
      console.log('Processing Excel file using Supabase Edge Function:', fileUrl);
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_excel',
          fileUrl,
          companyId: 'global' // We can set a default here
        }
      });

      if (error) {
        console.error('Error calling process-ai-data edge function for Excel:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Unknown error processing Excel');
      }

      // Process the response from the edge function
      const content = data.data || '';
      
      // Try to extract JSON from the response
      let extractedData: any[] = []; // Use more flexible typing initially
      let confidence = 0.7;
      
      try {
        // Look for JSON in the response
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                          content.match(/\{[\s\S]*\}/);
                          
        if (jsonMatch) {
          const jsonData = jsonMatch[1] || jsonMatch[0];
          const parsed = JSON.parse(jsonData);
          
          // Handle both array and single object formats
          extractedData = Array.isArray(parsed) ? parsed : [parsed];
          confidence = 0.85; // Higher confidence for structured extraction
        } else {
          // Fallback if no JSON found
          extractedData = [{
            date: new Date().toISOString().split('T')[0],
            source_type: 'excel',
            activity_description: 'Extracted from Excel file',
            quantity: 0,
            unit: 'units',
            ghg_category: 'Scope 3',
            status: 'processed',
            ai_processed: true,
            ai_confidence: 0.6
          }];
          confidence = 0.6;
        }
      } catch (e) {
        console.error('Error parsing response from edge function for Excel:', e);
        extractedData = [{
          date: new Date().toISOString().split('T')[0],
          source_type: 'excel',
          activity_description: 'Error extracting from Excel file',
          quantity: 0,
          unit: 'units',
          ghg_category: 'Scope 3',
          status: 'error',
          ai_processed: true,
          ai_confidence: 0.3
        }];
        confidence = 0.3;
      }
      
      // Convert to properly typed data
      const typedExtractedData: Partial<DataEntry>[] = extractedData.map((entry: any) => {
        return {
          date: entry.date || new Date().toISOString().split('T')[0],
          source_type: entry.source_type || 'excel',
          activity_description: entry.activity_description || entry.description || 'Extracted from Excel',
          quantity: entry.quantity || entry.amount || 0,
          unit: entry.unit || entry.amount_unit || 'units',
          ghg_category: this.formatGhgCategory(entry.ghg_category || `Scope ${entry.scope || 3}`),
          supplier_vendor: entry.supplier_vendor || entry.supplier || '',
          status: 'processed',
          ai_processed: true,
          ai_confidence: entry.ai_confidence || confidence,
          // Only include other fields if they match our data model
          currency: entry.currency,
          cost: entry.cost,
          notes: entry.notes,
          custom_tags: entry.custom_tags
        };
      });
      
      extractedData = typedExtractedData;
      
      return {
        success: true,
        message: 'Excel processing completed',
        mappings: [], // Excel vision processing doesn't return header mappings
        extracted_data: extractedData,
        confidence_score: confidence,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true // Always require review for Excel extraction
      };
    } catch (error) {
      console.error('Error extracting data from Excel:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error processing Excel',
        mappings: [],
        extracted_data: [],
        confidence_score: 0,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: true
      };
    }
  }
};

export default AIDataProcessingService; 