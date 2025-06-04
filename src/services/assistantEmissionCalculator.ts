import { unifiedCalculationService, type EmissionEntry, type BatchCalculationSummary } from './unifiedCalculationService';
import { supabase } from '@/integrations/supabase/client';

/**
 * DEPRECATED: Assistant Emission Calculator Service
 * 
 * This service is being phased out in favor of the UnifiedCalculationService.
 * It now acts as a lightweight wrapper for backward compatibility.
 * 
 * @deprecated Use unifiedCalculationService instead
 */
export class AssistantEmissionCalculator {
  constructor() {
    console.warn('⚠️ AssistantEmissionCalculator is deprecated. Use unifiedCalculationService instead.');
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateSingleEntry() instead
   */
  async calculateSingleEntry(entry: EmissionEntry) {
    console.warn('⚠️ calculateSingleEntry is deprecated. Use unifiedCalculationService.calculateSingleEntry() instead.');
    return await unifiedCalculationService.calculateSingleEntry(entry, false); // Prefer OpenAI for backward compatibility
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateBatchEntries() instead
   */
  async calculateBatchEntries(
    entries: EmissionEntry[],
    onProgress?: (completed: number, total: number, currentEntry?: EmissionEntry) => void
  ) {
    console.warn('⚠️ calculateBatchEntries is deprecated. Use unifiedCalculationService.calculateBatchEntries() instead.');
    
    // Adapt the progress callback
    const adaptedProgress = onProgress ? (completed: number, total: number) => {
      const currentEntry = entries[completed - 1];
      onProgress(completed, total, currentEntry);
    } : undefined;

    const result = await unifiedCalculationService.calculateBatchEntries(entries, adaptedProgress);
    
    // Convert to old format for backward compatibility
    return {
      results: [], // Edge functions save directly to DB
      summary: {
        total_entries: result.total_entries,
        successful_calculations: result.successful_calculations,
        failed_calculations: result.failed_calculations,
        total_scope1_emissions: 0, // Not available in new format
        total_scope2_emissions: 0,
        total_scope3_emissions: 0,
        processing_time_ms: result.processing_time_ms
      },
      errors: result.errors
    };
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateCompanyEmissions() instead
   */
  async calculateCompanyEmissions(
    companyId: string,
    onProgress?: (completed: number, total: number, currentEntry?: EmissionEntry) => void,
    includeCalculated: boolean = false
  ) {
    console.warn('⚠️ calculateCompanyEmissions is deprecated. Use unifiedCalculationService.calculateCompanyEmissions() instead.');
    
    const adaptedProgress = onProgress ? (completed: number, total: number) => {
      onProgress(completed, total);
    } : undefined;

    return await unifiedCalculationService.calculateCompanyEmissions(companyId, adaptedProgress, includeCalculated);
  }

  /**
   * @deprecated Use unifiedCalculationService.testCalculation() instead
   */
  async testSingleEntryCalculation(companyId: string, useDemo: boolean = true) {
    console.warn('⚠️ testSingleEntryCalculation is deprecated. Use unifiedCalculationService.testCalculation() instead.');
    
    const result = await unifiedCalculationService.testCalculation(companyId);
    
    // Convert to old format
    return {
      success: result.success,
      message: result.message,
      result: result.result,
      method: result.result?.method_used || 'unknown'
    };
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateCompanyEmissions() with limit instead
   */
  async calculateCompanyEmissionsSafe(
    companyId: string,
    maxEntries: number = 5,
    onProgress?: (completed: number, total: number, currentEntry?: EmissionEntry) => void,
    includeCalculated: boolean = false
  ) {
    console.warn('⚠️ calculateCompanyEmissionsSafe is deprecated. Use unifiedCalculationService instead.');
    
    // Fetch limited entries manually
    let query = supabase
      .from('emission_entries')
      .select('*')
      .eq('company_id', companyId);

    if (!includeCalculated) {
      query = query.eq('match_status', 'unmatched');
    }

    const { data: entries, error } = await query
      .order('date', { ascending: false })
      .limit(maxEntries);

    if (error) {
      throw new Error(`Failed to fetch emission entries: ${error.message}`);
    }

    if (!entries || entries.length === 0) {
      return {
        results: [],
        summary: {
          total_entries: 0,
          successful_calculations: 0,
          failed_calculations: 0,
          total_scope1_emissions: 0,
          total_scope2_emissions: 0,
          total_scope3_emissions: 0,
          processing_time_ms: 0
        },
        errors: []
      };
    }

    return this.calculateBatchEntries(entries, onProgress);
  }

  /**
   * @deprecated Not implemented in unified service
   */
  async saveCalculationResults(results: any[]) {
    console.warn('⚠️ saveCalculationResults is deprecated. Edge functions save results automatically.');
    // No-op - edge functions handle saving automatically
    return;
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateCompanyEmissions() instead
   */
  async processCompanyEmissions(
    companyId: string,
    onProgress?: (completed: number, total: number, currentEntry?: EmissionEntry) => void
  ): Promise<BatchCalculationSummary> {
    console.warn('⚠️ processCompanyEmissions is deprecated. Use unifiedCalculationService.calculateCompanyEmissions() instead.');
    return await this.calculateCompanyEmissions(companyId, onProgress);
  }

  /**
   * @deprecated Use unifiedCalculationService.calculateCompanyEmissions() with includeMatched=true instead
   */
  async recalculateAllCompanyEmissions(
    companyId: string,
    onProgress?: (completed: number, total: number, currentEntry?: EmissionEntry) => void
  ): Promise<BatchCalculationSummary> {
    console.warn('⚠️ recalculateAllCompanyEmissions is deprecated. Use unifiedCalculationService.calculateCompanyEmissions() instead.');
    return await this.calculateCompanyEmissions(companyId, onProgress, true);
  }
}

// Export a default instance for backward compatibility
export const assistantCalculator = new AssistantEmissionCalculator();

// Export utility functions
export const EmissionCalculatorUtils = {
  /**
   * @deprecated Use unifiedCalculationService.getCalculationStats() instead
   */
  async getCalculationStatus(companyId: string) {
    console.warn('⚠️ getCalculationStatus is deprecated. Use unifiedCalculationService.getCalculationStats() instead.');
    return await unifiedCalculationService.getCalculationStats(companyId);
  },

  /**
   * @deprecated Query the unified emission_calc table directly instead
   */
  async getEmissionsSummary(companyId: string) {
    console.warn('⚠️ getEmissionsSummary is deprecated. Query emission_calc table directly instead.');
    
    const { data: calculations } = await supabase
      .from('emission_calc')
      .select('total_emissions, activity_data')
      .eq('company_id', companyId);

    if (!calculations) return null;

    // Try to extract scope info from activity_data
    const scope1 = calculations
      .filter(c => c.activity_data?.scope === '1' || c.activity_data?.scope === 1)
      .reduce((sum, c) => sum + (c.total_emissions || 0), 0);
    
    const scope2 = calculations
      .filter(c => c.activity_data?.scope === '2' || c.activity_data?.scope === 2)
      .reduce((sum, c) => sum + (c.total_emissions || 0), 0);
    
    const scope3 = calculations
      .filter(c => c.activity_data?.scope === '3' || c.activity_data?.scope === 3)
      .reduce((sum, c) => sum + (c.total_emissions || 0), 0);

    return {
      scope1,
      scope2,
      scope3,
      total: calculations.reduce((sum, c) => sum + (c.total_emissions || 0), 0)
    };
  }
}; 