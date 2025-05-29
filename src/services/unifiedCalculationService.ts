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
  calculation_method: 'RAG' | 'ASSISTANT' | 'CLIMATIQ'
  similarity?: number
  fallback_reason?: string
  warnings?: string[]
  processing_time_ms?: number
  raw_input?: string
}

export interface CalculationSummary {
  total_calculations: number
  rag_calculations: number
  assistant_calculations: number
  climatiq_calculations: number
  average_confidence: number
  last_calculation: string
}

class UnifiedCalculationService {
  /**
   * Fetch all calculations from both RAG and OpenAI Assistant tables
   */
  async fetchAllCalculations(companyId: string): Promise<UnifiedCalculationEntry[]> {
    const calculations: UnifiedCalculationEntry[] = []

    try {
      // Fetch OpenAI Assistant calculations first (these definitely work)
      const { data: openaiData, error: openaiError } = await supabase
        .from('emission_calc_openai')
        .select(`
          id,
          entry_id,
          total_emissions,
          emissions_unit,
          calculated_at,
          activity_id,
          factor_name,
          source,
          activity_data,
          emission_entries (
            id,
            category,
            description,
            quantity,
            unit,
            scope,
            date
          )
        `)
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })

      if (openaiError) {
        console.warn('Could not fetch OpenAI calculations:', openaiError.message)
      } else if (openaiData) {
        // Process OpenAI Assistant calculations
        for (const item of openaiData) {
          const activityData = (item.activity_data as Record<string, any>) || {}
          const isAssistant = item.activity_id === 'assistant_calculated' || item.source === 'OPENAI_ASSISTANT_API'

          calculations.push({
            id: item.id,
            entry_id: item.entry_id ? String(item.entry_id) : '',
            category: item.emission_entries?.category || '',
            description: item.emission_entries?.description || '',
            quantity: item.emission_entries?.quantity || 0,
            unit: item.emission_entries?.unit || '',
            scope: item.emission_entries?.scope || 0,
            total_emissions: item.total_emissions || 0,
            emissions_unit: item.emissions_unit || 'kg CO2e',
            emission_factor: Number(activityData.emission_factor) || (item.total_emissions && item.emission_entries?.quantity ? item.total_emissions / item.emission_entries.quantity : 0),
            emission_factor_unit: String(activityData.emission_factor_unit) || `kg CO2e/${item.emission_entries?.unit || 'unit'}`,
            confidence: Number(activityData.confidence) || (isAssistant ? 0.95 : 1),
            source: item.source || 'Unknown',
            calculated_at: item.calculated_at || new Date().toISOString(),
            calculation_method: isAssistant ? 'ASSISTANT' : 'CLIMATIQ',
            fallback_reason: activityData.fallback_reason,
            warnings: activityData.warnings || []
          })
        }
      }
    } catch (error) {
      console.warn('OpenAI calculations not available:', error)
    }

    // Try to fetch RAG calculations using direct query (bypassing TypeScript constraints)
    try {
      // Use raw SQL query to fetch RAG calculations
      const { data: ragData, error: ragError } = await supabase
        .from('emission_calc_rag' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (!ragError && ragData && Array.isArray(ragData)) {
        // For each RAG calculation, get the emission entry details
        for (const ragItem of ragData) {
          try {
            // Type assertion for RAG item
            const ragCalc = ragItem as any

            const { data: entryData } = await supabase
              .from('emission_entries')
              .select('category, description, quantity, unit, scope')
              .eq('id', ragCalc.entry_id)
              .single()

            // Get emission factor source with better error handling
            const { data: factorData, error: factorError } = await supabase
              .from('emission_factor_db' as any)
              .select('Source')
              .eq('id', ragCalc.matched_factor_id)
              .single()

            if (factorError) {
              console.warn('Could not fetch factor source:', factorError)
            }

            // Use similarity as primary confidence for RAG, fallback to confidence_score
            const ragConfidence = ragCalc.similarity_score || ragCalc.confidence_score || 0

            calculations.push({
              id: ragCalc.id,
              entry_id: ragCalc.entry_id || '',
              category: entryData?.category || 'Unknown',
              description: entryData?.description || ragCalc.raw_input || '',
              quantity: entryData?.quantity || ragCalc.quantity || 0,
              unit: entryData?.unit || ragCalc.unit || '',
              scope: entryData?.scope || 0,
              total_emissions: ragCalc.total_emissions || 0,
              emissions_unit: ragCalc.emissions_unit || 'kg CO2e',
              emission_factor: ragCalc.emission_factor || 0,
              emission_factor_unit: `kg CO2e/${entryData?.unit || 'unit'}`,
              confidence: ragConfidence,
              source: (factorData as any)?.Source || 'Unknown Source',
              calculated_at: ragCalc.created_at || new Date().toISOString(),
              calculation_method: 'RAG',
              similarity: ragCalc.similarity_score,
              processing_time_ms: ragCalc.processing_time_ms,
              raw_input: ragCalc.raw_input,
              warnings: []
            })
          } catch (entryError) {
            console.warn('Could not fetch entry details for RAG calculation:', entryError)
          }
        }
      }
    } catch (error) {
      console.warn('RAG calculations not available (table may not exist yet):', error)
    }

    // Sort by calculated_at descending
    calculations.sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime())

    return calculations
  }

  /**
   * Get calculation summary statistics
   */
  async getCalculationSummary(companyId: string): Promise<CalculationSummary> {
    const calculations = await this.fetchAllCalculations(companyId)

    const ragCount = calculations.filter(c => c.calculation_method === 'RAG').length
    const assistantCount = calculations.filter(c => c.calculation_method === 'ASSISTANT').length
    const climatiqCount = calculations.filter(c => c.calculation_method === 'CLIMATIQ').length

    const totalConfidence = calculations.reduce((sum, c) => sum + c.confidence, 0)
    const averageConfidence = calculations.length > 0 ? totalConfidence / calculations.length : 0

    const lastCalculation = calculations.length > 0 ? calculations[0].calculated_at : ''

    return {
      total_calculations: calculations.length,
      rag_calculations: ragCount,
      assistant_calculations: assistantCount,
      climatiq_calculations: climatiqCount,
      average_confidence: averageConfidence,
      last_calculation: lastCalculation
    }
  }

  /**
   * Get calculations with filtering and sorting
   */
  async getFilteredCalculations(
    companyId: string,
    filters: {
      searchTerm?: string
      scopeFilter?: string
      methodFilter?: string
      dateRange?: { start: string; end: string }
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<UnifiedCalculationEntry[]> {
    let calculations = await this.fetchAllCalculations(companyId)

    // Apply filters
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      calculations = calculations.filter(calc => 
        calc.description.toLowerCase().includes(searchLower) ||
        calc.category.toLowerCase().includes(searchLower) ||
        calc.source.toLowerCase().includes(searchLower)
      )
    }

    if (filters.scopeFilter && filters.scopeFilter !== 'all') {
      calculations = calculations.filter(calc => calc.scope.toString() === filters.scopeFilter)
    }

    if (filters.methodFilter && filters.methodFilter !== 'all') {
      calculations = calculations.filter(calc => calc.calculation_method === filters.methodFilter)
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      calculations = calculations.filter(calc => {
        const calcDate = new Date(calc.calculated_at).toISOString().split('T')[0]
        const matchesStart = !filters.dateRange?.start || calcDate >= filters.dateRange.start
        const matchesEnd = !filters.dateRange?.end || calcDate <= filters.dateRange.end
        return matchesStart && matchesEnd
      })
    }

    // Apply sorting
    if (filters.sortBy && filters.sortOrder) {
      calculations.sort((a, b) => {
        let aValue = (a as any)[filters.sortBy!]
        let bValue = (b as any)[filters.sortBy!]

        // Handle date sorting
        if (filters.sortBy === 'calculated_at') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        }

        // Handle numeric sorting
        if (['quantity', 'total_emissions', 'scope', 'confidence'].includes(filters.sortBy!)) {
          aValue = Number(aValue) || 0
          bValue = Number(bValue) || 0
        }

        // Handle string sorting
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (filters.sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })
    }

    return calculations
  }
}

export const unifiedCalculationService = new UnifiedCalculationService() 