import { supabase } from '@/integrations/supabase/client'

export interface UnifiedCalculationEntry {
  id: string
  entry_id: string
  category: string
  description: string
  quantity: number
  unit: string
  scope: number
  total_emissions: number
  emissions_unit: string
  emission_factor: number
  emission_factor_unit: string
  confidence: number
  source: string
  calculated_at: string
  calculation_method: 'RAG' | 'OPENAI'
  similarity?: number
  fallback_reason?: string
  warnings?: string[]
  processing_time_ms?: number
  raw_input?: string
}

export interface CalculationSummary {
  total_calculations: number
  rag_calculations: number
  openai_calculations: number
  assistant_calculations: number
  average_confidence: number
  last_calculation: string
}

// Types for emission entries and calculations
interface EmissionEntry {
  id: string;
  company_id: string;
  date: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  scope: number | null;
  notes?: string | null;
  match_status?: string | null;
}

interface CalculationResult {
  success: boolean;
  method_used: 'RAG' | 'OPENAI' | 'FAILED';
  calculation_id?: string;
  total_emissions: number;
  emissions_unit: string;
  confidence: number;
  processing_time_ms: number;
  source: string;
  error?: string;
  entry_id: string;
}

interface BatchCalculationSummary {
  total_entries: number;
  successful_calculations: number;
  failed_calculations: number;
  rag_calculations: number;
  openai_calculations: number;
  total_emissions: number;
  processing_time_ms: number;
  errors: Array<{ entry_id: string; error: string }>;
}

/**
 * Unified Emission Calculation Service
 * 
 * This service consolidates all emission calculation logic and provides:
 * - Single entry calculations with RAG->OpenAI fallback
 * - Batch calculations using edge functions
 * - Proper error handling and retry logic
 * - Unified interface for all calculation methods
 */
export class UnifiedCalculationService {
  private readonly SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://vfdbyvnjhimmnbyhxyun.supabase.co";
  private readonly SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  constructor() {
    if (!this.SUPABASE_ANON_KEY) {
      throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
    }
  }
  
  private ragSimilarityThreshold = 0.75; // Minimum similarity for RAG to be considered reliable
  private maxRetries = 2;

  /**
   * Calculate emissions for a single entry with RAG->OpenAI fallback
   */
  async calculateSingleEntry(
    entry: EmissionEntry,
    preferRag: boolean = true
  ): Promise<CalculationResult> {
    const startTime = Date.now();
    
    console.log(`🔄 Calculating emissions for entry: ${entry.description}`);
    console.log(`   Method preference: ${preferRag ? 'RAG first' : 'OpenAI first'}`);

    if (preferRag) {
      // Try RAG first
      const ragResult = await this.tryRagCalculation(entry, startTime);
      if (ragResult.success) {
        console.log(`✅ RAG calculation successful with confidence above threshold`);
        return ragResult;
      }

      console.log(`⚠️ RAG failed or confidence below ${this.ragSimilarityThreshold}, falling back to OpenAI`);
      // Fallback to OpenAI
      return await this.tryOpenAICalculation(entry, startTime, 'RAG fallback');
    } else {
      // Try OpenAI first
      const openaiResult = await this.tryOpenAICalculation(entry, startTime);
      if (openaiResult.success) {
        return openaiResult;
      }

      console.log(`⚠️ OpenAI failed, falling back to RAG`);
      // Fallback to RAG
      return await this.tryRagCalculation(entry, startTime, 'OpenAI fallback');
    }
  }

  /**
   * Calculate emissions for multiple entries using edge functions
   */
  async calculateBatchEntries(
    entries: EmissionEntry[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchCalculationSummary> {
    const startTime = Date.now();
    
    if (entries.length === 0) {
      return this.createEmptySummary(0);
    }

    console.log(`🚀 Starting batch calculation for ${entries.length} entries`);
    
    // **FIX: Deduplication - Check for existing calculations first**
    const entriesWithoutCalculations = await this.filterEntriesWithoutCalculations(entries);
    
    if (entriesWithoutCalculations.length === 0) {
      console.log(`✅ All entries already have calculations`);
      return this.createEmptySummary(entries.length);
    }
    
    if (entriesWithoutCalculations.length < entries.length) {
      console.log(`📊 Filtered ${entries.length - entriesWithoutCalculations.length} entries that already have calculations`);
    }

    // For batch calculations, we'll try RAG first for all entries, then OpenAI for failed ones
    const ragResults = await this.batchRagCalculation(entriesWithoutCalculations, onProgress);
    
    // Find entries that failed RAG calculation
    const failedEntryIds = ragResults.errors.map(e => e.entry_id);
    const failedEntries = entriesWithoutCalculations.filter(e => failedEntryIds.includes(e.id));
    
    console.log(`🔄 RAG completed: ${ragResults.successful_calculations} success, ${ragResults.failed_calculations} failed`);
    
    let openaiResults: BatchCalculationSummary = this.createEmptySummary(0);
    
    if (failedEntries.length > 0) {
      console.log(`🤖 Running OpenAI fallback for ${failedEntries.length} failed entries`);
      openaiResults = await this.batchOpenAICalculation(failedEntries, onProgress);
    }

    // Combine results
    return {
      total_entries: entries.length,
      successful_calculations: ragResults.successful_calculations + openaiResults.successful_calculations,
      failed_calculations: openaiResults.failed_calculations, // Only count final failures
      rag_calculations: ragResults.successful_calculations,
      openai_calculations: openaiResults.successful_calculations,
      total_emissions: ragResults.total_emissions + openaiResults.total_emissions,
      processing_time_ms: Date.now() - startTime,
      errors: openaiResults.errors // Only final errors after both attempts
    };
  }

  /**
   * **FIX: New method to filter out entries that already have calculations**
   */
  private async filterEntriesWithoutCalculations(entries: EmissionEntry[]): Promise<EmissionEntry[]> {
    if (entries.length === 0) return entries;

    try {
      const entryIds = entries.map(e => e.id);
      
      const { data: existingCalculations, error } = await supabase
        .from('emission_calc')
        .select('entry_id')
        .in('entry_id', entryIds);

      if (error) {
        console.warn('Could not check existing calculations:', error);
        return entries; // Return all entries if check fails
      }

      const calculatedEntryIds = new Set(existingCalculations?.map(calc => calc.entry_id) || []);
      const filteredEntries = entries.filter(entry => !calculatedEntryIds.has(entry.id));
      
      console.log(`🔍 Deduplication: ${entries.length} total, ${calculatedEntryIds.size} already calculated, ${filteredEntries.length} to process`);
      
      return filteredEntries;
    } catch (error) {
      console.warn('Error during deduplication check:', error);
      return entries; // Return all entries if deduplication fails
    }
  }

  /**
   * Calculate emissions for all unmatched entries of a company
   */
  async calculateCompanyEmissions(
    companyId: string,
    onProgress?: (completed: number, total: number) => void,
    includeMatched: boolean = false
  ): Promise<BatchCalculationSummary> {
    console.log(`🏢 Fetching emission entries for company: ${companyId}`);
    
    let query = supabase
      .from('emission_entries')
      .select('*')
      .eq('company_id', companyId);

    if (!includeMatched) {
      query = query.eq('match_status', 'unmatched');
    }

    const { data: entries, error } = await query.order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch emission entries: ${error.message}`);
    }

    if (!entries || entries.length === 0) {
      console.log(`No entries found for company: ${companyId}`);
      return this.createEmptySummary(0);
    }

    console.log(`Found ${entries.length} entries for calculation`);
    return this.calculateBatchEntries(entries, onProgress);
  }

  /**
   * Get calculation statistics for a company
   */
  async getCalculationStats(companyId: string) {
    try {
      // Get total entries
      const { count: totalEntries } = await supabase
        .from('emission_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Get calculated entries  
      const { count: calculatedEntries } = await supabase
        .from('emission_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('match_status', 'matched');

      // Get calculations by method from unified table
      const { data: methodStats } = await supabase
        .from('emission_calc')
        .select('calculation_method, total_emissions')
        .eq('company_id', companyId);

      const ragCount = methodStats?.filter(m => m.calculation_method === 'RAG').length || 0;
      const openaiCount = methodStats?.filter(m => m.calculation_method === 'OPENAI').length || 0;
      const totalEmissions = methodStats?.reduce((sum, m) => sum + (m.total_emissions || 0), 0) || 0;

      return {
        total_entries: totalEntries || 0,
        calculated_entries: calculatedEntries || 0,
        pending_entries: (totalEntries || 0) - (calculatedEntries || 0),
        rag_calculations: ragCount,
        openai_calculations: openaiCount,
        total_emissions: totalEmissions,
        completion_percentage: totalEntries ? Math.round(((calculatedEntries || 0) / totalEntries) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting calculation stats:', error);
      throw error;
    }
  }

  /**
   * Test the calculation system with a sample entry
   */
  async testCalculation(companyId: string): Promise<{
    success: boolean;
    message: string;
    result?: CalculationResult;
  }> {
    try {
      // Get one unmatched entry for testing
      const { data: entries, error } = await supabase
        .from('emission_entries')
        .select('*')
        .eq('company_id', companyId)
        .eq('match_status', 'unmatched')
        .limit(1);

      if (error) {
        return { success: false, message: `Database error: ${error.message}` };
      }

      if (!entries || entries.length === 0) {
        return { success: false, message: 'No unmatched entries found for testing' };
      }

      const testEntry = entries[0] as EmissionEntry;
      const result = await this.calculateSingleEntry(testEntry);

      if (result.success) {
        return {
          success: true,
          message: `Test successful! Used ${result.method_used} method. Emissions: ${result.total_emissions} ${result.emissions_unit}`,
          result
        };
      } else {
        return {
          success: false,
          message: `Test failed: ${result.error}`,
          result
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Private methods for individual calculation attempts

  private async tryRagCalculation(
    entry: EmissionEntry,
    startTime: number,
    fallbackReason?: string
  ): Promise<CalculationResult> {
    try {
      console.log('🤖 Attempting RAG calculation...');
      
      // Get the auth session for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const authToken = session?.access_token || this.SUPABASE_ANON_KEY;
      
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'apikey': this.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          raw_input: `${entry.description} - ${entry.quantity} ${entry.unit}`,
          company_id: entry.company_id,
          entry_id: entry.id,
          demo_mode: false
        })
      });

      console.log('📡 RAG API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ RAG API error response:', errorText);
        throw new Error(`RAG API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 RAG API Response data:', data);

      // Check both similarity_score and confidence_score against threshold
      const similarityScore = data.similarity_score || 0;
      const confidenceScore = data.confidence_score || 0;
      
      console.log(`🔍 RAG Scores: similarity=${similarityScore.toFixed(3)}, confidence=${confidenceScore.toFixed(3)}, threshold=${this.ragSimilarityThreshold}`);

      if (data.success && similarityScore >= this.ragSimilarityThreshold) {
        console.log(`✅ RAG calculation ACCEPTED (similarity: ${similarityScore.toFixed(3)} >= threshold: ${this.ragSimilarityThreshold})`);
        
        return {
          success: true,
          method_used: 'RAG',
          calculation_id: data.calculation_id,
          total_emissions: data.total_emissions,
          emissions_unit: data.emissions_unit || 'kg CO2e',
          confidence: confidenceScore || similarityScore,
          processing_time_ms: Date.now() - startTime,
          source: data.source || 'RAG_SYSTEM',
          entry_id: entry.id
        };
      } else {
        console.log(`❌ RAG calculation REJECTED: similarity=${similarityScore.toFixed(3)} < threshold=${this.ragSimilarityThreshold} (OR success=${data.success})`);
        throw new Error(`RAG confidence too low: similarity=${similarityScore}, confidence=${confidenceScore} (threshold: ${this.ragSimilarityThreshold})`);
      }
    } catch (error) {
      console.log(`❌ RAG calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        method_used: 'FAILED',
        total_emissions: 0,
        emissions_unit: 'kg CO2e',
        confidence: 0,
        processing_time_ms: Date.now() - startTime,
        source: 'RAG_FAILED',
        error: error instanceof Error ? error.message : 'Unknown RAG error',
        entry_id: entry.id
      };
    }
  }

  private async tryOpenAICalculation(
    entry: EmissionEntry,
    startTime: number,
    fallbackReason?: string
  ): Promise<CalculationResult> {
    try {
      console.log('🧠 Attempting OpenAI calculation...');
      
      // Get the auth session for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      const authToken = session?.access_token || this.SUPABASE_ANON_KEY;
      
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/calculate-emissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'apikey': this.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          company_id: entry.company_id,
          entry_ids: [entry.id]
        })
      });

      console.log('📡 OpenAI API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error response:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 OpenAI API Response data:', data);

      if (data.calculated > 0 && data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log(`✅ OpenAI calculation successful`);
        
        return {
          success: true,
          method_used: 'OPENAI',
          calculation_id: result.entry_id,
          total_emissions: result.emissions,
          emissions_unit: result.emissions_unit || 'kg CO2e',
          confidence: 0.95, // OpenAI typically has high confidence
          processing_time_ms: Date.now() - startTime,
          source: result.source || 'OPENAI_ASSISTANT',
          entry_id: entry.id
        };
      } else {
        throw new Error('OpenAI calculation returned no results');
      }
    } catch (error) {
      console.log(`❌ OpenAI calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        method_used: 'FAILED',
        total_emissions: 0,
        emissions_unit: 'kg CO2e',
        confidence: 0,
        processing_time_ms: Date.now() - startTime,
        source: 'OPENAI_FAILED',
        error: error instanceof Error ? error.message : 'Unknown OpenAI error',
        entry_id: entry.id
      };
    }
  }

  private async batchRagCalculation(
    entries: EmissionEntry[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchCalculationSummary> {
    // RAG currently doesn't have batch processing, so we'll process individually
    // In a real implementation, you might want to add batch processing to the RAG edge function
    
    const results = await Promise.allSettled(
      entries.map(async (entry, index) => {
        const result = await this.tryRagCalculation(entry, Date.now());
        onProgress?.(index + 1, entries.length);
        return result;
      })
    );

    return this.processBatchResults(results, 'RAG');
  }

  private async batchOpenAICalculation(
    entries: EmissionEntry[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchCalculationSummary> {
    try {
      const entryIds = entries.map(e => e.id);
      const companyId = entries[0].company_id;

      // Get auth session for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || this.SUPABASE_ANON_KEY;

      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/calculate-emissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'apikey': this.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          company_id: companyId,
          entry_ids: entryIds
        })
      });

      const data = await response.json();
      onProgress?.(entries.length, entries.length);

      const successful = data.calculated || 0;
      const failed = entries.length - successful;
      const errors = (data.errors || []).map((e: any) => ({
        entry_id: e.entry_id,
        error: e.error || 'Unknown OpenAI error'
      }));

      return {
        total_entries: entries.length,
        successful_calculations: successful,
        failed_calculations: failed,
        rag_calculations: 0,
        openai_calculations: successful,
        total_emissions: 0, // Will be calculated from database
        processing_time_ms: 0, // Not available from batch
        errors
      };
    } catch (error) {
      return {
        total_entries: entries.length,
        successful_calculations: 0,
        failed_calculations: entries.length,
        rag_calculations: 0,
        openai_calculations: 0,
        total_emissions: 0,
        processing_time_ms: 0,
        errors: entries.map(e => ({
          entry_id: e.id,
          error: error instanceof Error ? error.message : 'Batch OpenAI error'
        }))
      };
    }
  }

  private processBatchResults(
    results: PromiseSettledResult<CalculationResult>[],
    method: 'RAG' | 'OPENAI'
  ): BatchCalculationSummary {
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<CalculationResult> => r.status === 'fulfilled' && r.value.success)
      .map(r => r.value);
    
    const totalEmissions = successfulResults.reduce((sum, r) => sum + r.total_emissions, 0);
    
    const errors = results
      .filter((r): r is PromiseFulfilledResult<CalculationResult> => r.status === 'fulfilled' && !r.value.success)
      .map(r => ({
        entry_id: r.value.entry_id,
        error: r.value.error || 'Unknown error'
      }))
      .concat(
        results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => ({
            entry_id: 'unknown',
            error: r.reason instanceof Error ? r.reason.message : 'Promise rejection'
          }))
      );

    return {
      total_entries: results.length,
      successful_calculations: successful,
      failed_calculations: failed,
      rag_calculations: method === 'RAG' ? successful : 0,
      openai_calculations: method === 'OPENAI' ? successful : 0,
      total_emissions: totalEmissions,
      processing_time_ms: 0,
      errors
    };
  }

  private createEmptySummary(totalEntries: number): BatchCalculationSummary {
    return {
      total_entries: totalEntries,
      successful_calculations: 0,
      failed_calculations: 0,
      rag_calculations: 0,
      openai_calculations: 0,
      total_emissions: 0,
      processing_time_ms: 0,
      errors: []
    };
  }

  /**
   * Fetch all calculations for a company with pagination and filtering
   */
  async fetchAllCalculations(
    companyId: string,
    options: {
      limit?: number;
      offset?: number;
      method_filter?: 'RAG' | 'OPENAI';
      date_from?: string;
      date_to?: string;
    } = {}
  ) {
    try {
      let query = supabase
        .from('emission_calc')
        .select(`
          *,
          emission_entries!inner(
            id,
            date,
            category,
            description,
            quantity,
            unit,
            scope,
            match_status
          )
        `)
        .eq('company_id', companyId);

      if (options.method_filter) {
        query = query.eq('calculation_method', options.method_filter);
      }

      if (options.date_from) {
        query = query.gte('calculated_at', options.date_from);
      }

      if (options.date_to) {
        query = query.lte('calculated_at', options.date_to);
      }

      query = query
        .order('calculated_at', { ascending: false })
        .limit(options.limit || 50)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching calculations:', error);
      return {
        success: false,
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get calculation summary for dashboard
   */
  async getCalculationSummary(companyId: string) {
    try {
      // Get all calculations with scope and emissions data
      const { data: calculations, error } = await supabase
        .from('emission_calc')
        .select('calculation_method, total_emissions, scope, calculated_at, co2_emissions, ch4_emissions, n2o_emissions')
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      if (!calculations || calculations.length === 0) {
        return {
          total_calculations: 0,
          rag_calculations: 0,
          openai_calculations: 0,
          assistant_calculations: 0, // Add for compatibility
          total_emissions: 0,
          average_emissions_per_calculation: 0,
          calculations_this_month: 0,
          last_calculation: null,
          scope_breakdown: {
            scope_1: { count: 0, emissions: 0 },
            scope_2: { count: 0, emissions: 0 },
            scope_3: { count: 0, emissions: 0 }
          },
          gas_breakdown: {
            co2: 0,
            ch4: 0,
            n2o: 0
          },
          method_breakdown: {
            rag: { count: 0, emissions: 0 },
            openai: { count: 0, emissions: 0 }
          }
        };
      }

      // Calculate metrics
      const ragCalculations = calculations.filter(c => c.calculation_method === 'RAG');
      const openaiCalculations = calculations.filter(c => c.calculation_method === 'OPENAI');
      const totalEmissions = calculations.reduce((sum, c) => sum + (c.total_emissions || 0), 0);
      
      // Scope breakdown
      const scopeBreakdown = {
        scope_1: { count: 0, emissions: 0 },
        scope_2: { count: 0, emissions: 0 },
        scope_3: { count: 0, emissions: 0 }
      };
      
      calculations.forEach(calc => {
        const scope = calc.scope || 1;
        const emissions = calc.total_emissions || 0;
        
        if (scope === 1) {
          scopeBreakdown.scope_1.count++;
          scopeBreakdown.scope_1.emissions += emissions;
        } else if (scope === 2) {
          scopeBreakdown.scope_2.count++;
          scopeBreakdown.scope_2.emissions += emissions;
        } else if (scope === 3) {
          scopeBreakdown.scope_3.count++;
          scopeBreakdown.scope_3.emissions += emissions;
        }
      });

      // Gas breakdown
      const gasBreakdown = {
        co2: calculations.reduce((sum, c) => sum + (c.co2_emissions || c.total_emissions || 0), 0),
        ch4: calculations.reduce((sum, c) => sum + (c.ch4_emissions || 0), 0),
        n2o: calculations.reduce((sum, c) => sum + (c.n2o_emissions || 0), 0)
      };

      // Method breakdown
      const methodBreakdown = {
        rag: {
          count: ragCalculations.length,
          emissions: ragCalculations.reduce((sum, c) => sum + (c.total_emissions || 0), 0)
        },
        openai: {
          count: openaiCalculations.length,
          emissions: openaiCalculations.reduce((sum, c) => sum + (c.total_emissions || 0), 0)
        }
      };

      // Get most recent calculation
      const latestCalculation = calculations.sort((a, b) => 
        new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
      )[0];

      // Count this month's calculations
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const calculationsThisMonth = calculations.filter(c => 
        new Date(c.calculated_at) >= thisMonth
      ).length;

      return {
        total_calculations: calculations.length,
        rag_calculations: ragCalculations.length,
        openai_calculations: openaiCalculations.length,
        assistant_calculations: openaiCalculations.length, // Compatibility alias
        total_emissions: totalEmissions,
        average_emissions_per_calculation: calculations.length > 0 ? totalEmissions / calculations.length : 0,
        calculations_this_month: calculationsThisMonth,
        last_calculation: latestCalculation,
        scope_breakdown: scopeBreakdown,
        gas_breakdown: gasBreakdown,
        method_breakdown: methodBreakdown
      };
    } catch (error) {
      console.error('Error fetching calculation summary:', error);
      return {
        total_calculations: 0,
        rag_calculations: 0,
        openai_calculations: 0,
        assistant_calculations: 0,
        total_emissions: 0,
        average_emissions_per_calculation: 0,
        calculations_this_month: 0,
        last_calculation: null,
        scope_breakdown: {
          scope_1: { count: 0, emissions: 0 },
          scope_2: { count: 0, emissions: 0 },
          scope_3: { count: 0, emissions: 0 }
        },
        gas_breakdown: {
          co2: 0,
          ch4: 0,
          n2o: 0
        },
        method_breakdown: {
          rag: { count: 0, emissions: 0 },
          openai: { count: 0, emissions: 0 }
        }
      };
    }
  }

  /**
   * Get calculation data for dashboard charts
   */
  async getCalculationData(companyId: string) {
    try {
      // Get all calculations with entry data
      const { data: calculations, error } = await supabase
        .from('emission_calc')
        .select(`
          *,
          emission_entries!inner(
            date,
            category,
            scope
          )
        `)
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        calculations: calculations || [],
        success: true
      };
    } catch (error) {
      console.error('Error getting calculation data:', error);
      return {
        calculations: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete calculation by ID
   */
  async deleteCalculation(calculationId: string) {
    try {
      const { error } = await supabase
        .from('emission_calc')
        .delete()
        .eq('id', calculationId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting calculation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get recent calculations for a company
   */
  async getRecentCalculations(companyId: string, limit: number = 10) {
    try {
      const { data: calculations, error } = await supabase
        .from('emission_calc')
        .select(`
          *,
          emission_entries!inner(
            date,
            category,
            description,
            quantity,
            unit
          )
        `)
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return {
        calculations: calculations || [],
        success: true
      };
    } catch (error) {
      console.error('Error getting recent calculations:', error);
      return {
        calculations: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get emissions by scope for dashboard charts
   */
  async getEmissionsByScope(companyId: string) {
    try {
      const { data: calculations, error } = await supabase
        .from('emission_calc')
        .select(`
          total_emissions,
          activity_data,
          emission_entries!inner(scope)
        `)
        .eq('company_id', companyId);

      if (error) {
        throw error;
      }

      const emissionsByScope = {
        scope1: 0,
        scope2: 0,
        scope3: 0
      };

      calculations?.forEach(calc => {
        const scope = calc.emission_entries?.scope || 
                     calc.activity_data?.scope || 
                     1; // default to scope 1

        const emissions = calc.total_emissions || 0;
        
        if (scope === 1 || scope === '1') {
          emissionsByScope.scope1 += emissions;
        } else if (scope === 2 || scope === '2') {
          emissionsByScope.scope2 += emissions;
        } else if (scope === 3 || scope === '3') {
          emissionsByScope.scope3 += emissions;
        }
      });

      return {
        ...emissionsByScope,
        success: true
      };
    } catch (error) {
      console.error('Error getting emissions by scope:', error);
      return {
        scope1: 0,
        scope2: 0,
        scope3: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export a singleton instance
export const unifiedCalculationService = new UnifiedCalculationService();

// Export types for external use
export type { EmissionEntry, CalculationResult, BatchCalculationSummary }; 