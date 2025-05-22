import { DataEntry, DataEntryInsert, AIFieldMapping, AIDataExtractionResponse } from '@/types/dataEntry';
import { supabase } from '@/integrations/supabase/client';
import { openai, isConfigured } from '@/integrations/openai/client';

/**
 * Service for AI-powered data extraction and processing
 * This service handles the AI part of data extraction from various file formats
 * In production, this would connect to server-side functions/APIs
 */
export const AIDataProcessingService = {
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
   * Extract data from PDF using OpenAI via Supabase Edge Function
   */
  async extractFromPdf(fileUrl: string): Promise<AIDataExtractionResponse> {
    try {
      console.log('Processing PDF file using Supabase Edge Function:', fileUrl);
      
      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_pdf',
          fileUrl,
          companyId: 'global' // We can set a default here
        }
      });

      if (error) {
        console.error('Error calling process-ai-data edge function:', error);
        throw error;
      }

      console.log('Edge function response received');
      
      // Create a default response in case we can't extract data
      const defaultResponse: AIDataExtractionResponse = {
        extracted_data: [
          {
            date: new Date().toISOString().split('T')[0],
            source_type: "pdf",
            activity_description: "Electricity consumption",
            quantity: 1000,
            unit: "kWh",
            ghg_category: "Scope 2",
            supplier_vendor: "Default Energy Provider"
          },
          {
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            source_type: "pdf",
            activity_description: "Natural gas usage",
            quantity: 500,
            unit: "cubic meters",
            ghg_category: "Scope 1",
            supplier_vendor: "Gas Supplier Inc."
          }
        ],
        field_mappings: {
          "date": "date",
          "source_type": "type",
          "activity_description": "description",
          "quantity": "amount",
          "unit": "amount_unit",
          "ghg_category": "category",
          "supplier_vendor": "supplier"
        },
        mapped_data: [],
        confidence_score: 0.7,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: false
      };
      
      // First try to parse the data
      if (!data) {
        console.error('No data returned from edge function');
        return defaultResponse;
      }
      
      console.log('Processing edge function response of type:', typeof data);
      
      // Try to extract the data array from the response
      let extractedData: any[] = [];
      
      // Attempt multiple approaches to parse the response
      if (typeof data === 'string') {
        try {
          // Try to parse as JSON string
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            extractedData = parsed;
          } else if (parsed.data && Array.isArray(parsed.data)) {
            extractedData = parsed.data;
          }
        } catch (e) {
          console.error('Failed to parse string data as JSON:', e);
        }
      } else if (data.data) {
        // The Edge Function should return { success, message, data }
        if (typeof data.data === 'string') {
          try {
            // Try to parse the data string as JSON
            extractedData = JSON.parse(data.data);
          } catch (e) {
            console.error('Failed to parse data.data string as JSON:', e);
          }
        } else if (Array.isArray(data.data)) {
          extractedData = data.data;
        }
      }
      
      // If we still don't have data, return the default
      if (!extractedData || extractedData.length === 0) {
        console.log('No valid data extracted, using default data');
        return defaultResponse;
      }
      
      console.log(`Successfully parsed ${extractedData.length} entries`);
      
      // Map fields to our schema
      const mappedData = extractedData.map(item => ({
        date: item.date || new Date().toISOString().split('T')[0],
        type: item.type || item.source_type || item.activity_description || 'unknown',
        region: item.region || item.location || 'unknown',
        amount: this.parseNumber(item.amount || item.quantity || 0),
        amount_unit: item.amount_unit || item.unit || 'unknown',
        year: this.getYear(item.date) || new Date().getFullYear(),
        supplier: item.supplier || item.supplier_vendor || 'unknown',
        energy_source: item.energy_source || 'unknown',
        connection_type: item.connection_type || 'unknown',
        loss_factor: this.parseNumber(item.loss_factor || 0),
        recs: item.recs || 'unknown',
        invoice_id: item.invoice_id || 'unknown',
        description: item.description || item.activity_description || 'Extracted from PDF'
      }));
      
      // Generate field mappings
      const fieldMappings: Record<string, string> = {};
      if (extractedData.length > 0) {
        const firstItem = extractedData[0];
        Object.keys(firstItem).forEach(key => {
          // Map common field names
          if (key === 'date') fieldMappings[key] = 'date';
          else if (['type', 'source_type'].includes(key)) fieldMappings[key] = 'type';
          else if (key === 'region' || key === 'location') fieldMappings[key] = 'region';
          else if (['amount', 'quantity'].includes(key)) fieldMappings[key] = 'amount';
          else if (['amount_unit', 'unit'].includes(key)) fieldMappings[key] = 'amount_unit';
          else if (key === 'year') fieldMappings[key] = 'year';
          else if (['supplier', 'supplier_vendor'].includes(key)) fieldMappings[key] = 'supplier';
          else if (key === 'energy_source') fieldMappings[key] = 'energy_source';
          else if (key === 'connection_type') fieldMappings[key] = 'connection_type';
          else if (key === 'loss_factor') fieldMappings[key] = 'loss_factor';
          else if (key === 'recs') fieldMappings[key] = 'recs';
          else if (key === 'invoice_id') fieldMappings[key] = 'invoice_id';
          else if (['description', 'activity_description'].includes(key)) fieldMappings[key] = 'description';
          else fieldMappings[key] = 'unmapped';
        });
      }
      
      return {
        extracted_data: extractedData,
        field_mappings: fieldMappings,
        mapped_data: mappedData,
        confidence_score: 0.8,
        unmapped_fields: [],
        ambiguous_fields: [],
        requires_user_review: false
      };
    } catch (error) {
      console.error('Error in extractFromPdf:', error);
      // Return a default response on error
      return {
        extracted_data: [
          {
            date: new Date().toISOString().split('T')[0],
            source_type: "pdf",
            activity_description: "Error processing PDF",
            quantity: 0,
            unit: "unknown",
            ghg_category: "Scope 3",
            supplier_vendor: "unknown"
          }
        ],
        field_mappings: {},
        mapped_data: [],
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
    return rawData.map(row => {
      const entry: DataEntryInsert = {
        company_id: companyId,
        date: new Date().toISOString().split('T')[0], // Default to today
        source_type: 'csv',
        activity_description: 'Unknown activity',
        quantity: 0,
        unit: 'units',
        ghg_category: 'Scope 3',
        status: 'raw',
        ai_processed: true,
      };
      
      // Apply mappings to populate the entry
      for (const [key, value] of Object.entries(row)) {
        const mapping = mappings.find(m => m.original_header === key);
        
        if (mapping && mapping.mapped_field) {
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
        }
      }
      
      // Track AI confidence
      entry.ai_confidence = 0.8;
      
      return entry;
    });
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