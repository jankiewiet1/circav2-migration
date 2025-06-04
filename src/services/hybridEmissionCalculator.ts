import { unifiedCalculationService, type EmissionEntry, type CalculationResult } from './unifiedCalculationService';

/**
 * DEPRECATED: Hybrid Emission Calculator Service
 * 
 * This service is being phased out in favor of the UnifiedCalculationService.
 * The unified service now handles RAG->OpenAI fallback automatically.
 * 
 * @deprecated Use unifiedCalculationService instead
 */

export interface HybridCalculationRequest {
  raw_input: string
  company_id: string
  entry_id?: string
  prefer_rag?: boolean // Default true
}

export interface HybridCalculationResult {
  success: boolean
  method_used: 'RAG' | 'OPENAI' | 'FAILED'
  calculation_id: string
  parsed_data: {
    category: string
    subcategory?: string
    fuel_type?: string
    quantity: number
    unit: string
    description: string
    confidence: number
  }
  matched_factor?: {
    id: string
    description: string
    source: string
    similarity?: number
  }
  calculation: {
    quantity: number
    unit: string
    emission_factor: number
    emission_factor_unit: string
    total_emissions: number
    emissions_unit: string
    breakdown?: {
      co2: number | null
      ch4: number | null
      n2o: number | null
    }
    scope: number | null
    confidence: number
  }
  processing_time_ms: number
  fallback_reason?: string
  alternative_matches?: Array<{
    id: string
    description: string
    source: string
    similarity?: number
  }>
  error?: string
}

export interface BatchHybridCalculationResult {
  results: HybridCalculationResult[]
  summary: {
    total_entries: number
    rag_successful: number
    assistant_successful: number
    failed: number
    total_processing_time_ms: number
  }
  errors: Array<{ entry_id: string; error: string }>
}

class HybridEmissionCalculator {
  constructor() {
    console.warn('⚠️ HybridEmissionCalculator is deprecated. Use unifiedCalculationService instead - it now handles RAG->OpenAI fallback automatically.');
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateSingleEntry() instead
   */
  async calculateEmissions(request: HybridCalculationRequest): Promise<HybridCalculationResult> {
    console.warn('⚠️ calculateEmissions is deprecated. Use unifiedCalculationService.calculateSingleEntry() instead.');
    
    // Convert request to EmissionEntry format (simplified)
    const mockEntry: EmissionEntry = {
      id: request.entry_id || 'mock',
      company_id: request.company_id,
      date: new Date().toISOString(),
      category: 'unknown',
      description: request.raw_input,
      quantity: 1,
      unit: 'unit',
      scope: null,
      match_status: 'unmatched'
    };

    const result = await unifiedCalculationService.calculateSingleEntry(mockEntry, request.prefer_rag !== false);
    
    // Convert to old format
    return {
      success: result.success,
      method_used: result.method_used,
      calculation_id: result.calculation_id || '',
      parsed_data: {
        category: 'unknown',
        quantity: 1,
        unit: 'unit',
        description: request.raw_input,
        confidence: result.confidence
      },
      calculation: {
        quantity: 1,
        unit: 'unit',
        emission_factor: result.total_emissions,
        emission_factor_unit: result.emissions_unit,
        total_emissions: result.total_emissions,
        emissions_unit: result.emissions_unit,
        scope: null,
        confidence: result.confidence
      },
      processing_time_ms: result.processing_time_ms,
      error: result.error
    };
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateBatchEntries() instead
   */
  async batchCalculateEmissions(
    inputs: Array<{ raw_input: string; entry_id?: string }>,
    companyId: string,
    preferRag = true
  ): Promise<BatchHybridCalculationResult> {
    console.warn('⚠️ batchCalculateEmissions is deprecated. Use unifiedCalculationService.calculateBatchEntries() instead.');
    
    // This would require fetching actual entries from the database
    // For now, return an empty result
    return {
      results: [],
      summary: {
        total_entries: inputs.length,
        rag_successful: 0,
        assistant_successful: 0,
        failed: inputs.length,
        total_processing_time_ms: 0
      },
      errors: inputs.map(input => ({
        entry_id: input.entry_id || 'unknown',
        error: 'batchCalculateEmissions is deprecated - use unifiedCalculationService instead'
      }))
    };
  }

  /**
   * @deprecated Use unifiedCalculationService.testCalculation() instead
   */
  async testRagSystem(input: string, companyId: string): Promise<{ success: boolean; message: string; result?: any }> {
    console.warn('⚠️ testRagSystem is deprecated. Use unifiedCalculationService.testCalculation() instead.');
    
    const result = await unifiedCalculationService.testCalculation(companyId);
    return {
      success: result.success,
      message: result.message,
      result: result.result
    };
  }
}

export const hybridEmissionCalculator = new HybridEmissionCalculator(); 