import { supabase } from '@/integrations/supabase/client'

export interface RAGCalculationRequest {
  raw_input: string
  company_id: string
  entry_id?: string
}

export interface RAGCalculationResult {
  success: boolean
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
  matched_factor: {
    id: string
    description: string
    source: string
    similarity: number
  }
  calculation: {
    quantity: number
    unit: string
    emission_factor: number
    emission_factor_unit: string
    total_emissions: number
    emissions_unit: string
    breakdown: {
      co2: number | null
      ch4: number | null
      n2o: number | null
    }
    scope: number | null
    confidence: number
  }
  processing_time_ms: number
  alternative_matches?: Array<{
    id: string
    description: string
    source: string
    similarity: number
  }>
  error?: string
}

export interface EmissionFactorSearchResult {
  id: string
  description: string
  total_factor: number
  unit: string
  ghg_unit: string
  scope: string
  source: string
  similarity: number
}

class RAGEmissionsService {
  /**
   * Calculate emissions using RAG-based approach
   */
  async calculateEmissions(request: RAGCalculationRequest): Promise<RAGCalculationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('rag-emissions-calculator', {
        body: request
      })

      if (error) {
        throw new Error(`RAG calculation failed: ${error.message}`)
      }

      return data as RAGCalculationResult
    } catch (error) {
      console.error('RAG emissions calculation error:', error)
      throw error
    }
  }

  /**
   * Get calculation history for a company
   */
  async getCalculationHistory(companyId: string, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('emission_calc_rag')
        .select(`
          *,
          matched_factor:emission_factor_db(
            description,
            source,
            scope,
            unit,
            ghg_unit
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch calculation history: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching calculation history:', error)
      throw error
    }
  }

  /**
   * Search emission factors by similarity
   */
  async searchEmissionFactors(
    query: string, 
    threshold = 0.7, 
    maxResults = 10
  ): Promise<EmissionFactorSearchResult[]> {
    try {
      // First, get embedding for the query
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embedding', {
        body: { text: query }
      })

      if (embeddingError) {
        throw new Error(`Failed to generate embedding: ${embeddingError.message}`)
      }

      // Then search using the embedding
      const { data, error } = await supabase.rpc('find_similar_emission_factors', {
        query_embedding: embeddingData.embedding,
        similarity_threshold: threshold,
        max_results: maxResults
      })

      if (error) {
        throw new Error(`Similarity search failed: ${error.message}`)
      }

      return data as EmissionFactorSearchResult[]
    } catch (error) {
      console.error('Error searching emission factors:', error)
      throw error
    }
  }

  /**
   * Get emission factors by category
   */
  async getEmissionFactorsByCategory(category: string, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('emission_factor_db')
        .select('*')
        .or(`category_1.ilike.%${category}%,category_2.ilike.%${category}%,description.ilike.%${category}%`)
        .limit(limit)

      if (error) {
        throw new Error(`Failed to fetch emission factors: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching emission factors by category:', error)
      throw error
    }
  }

  /**
   * Get calculation statistics for a company
   */
  async getCalculationStats(companyId: string) {
    try {
      const { data, error } = await supabase
        .from('emission_calc_rag')
        .select('total_emissions, scope, created_at, confidence_score')
        .eq('company_id', companyId)

      if (error) {
        throw new Error(`Failed to fetch calculation stats: ${error.message}`)
      }

      // Calculate statistics
      const totalEmissions = data.reduce((sum, calc) => sum + (calc.total_emissions || 0), 0)
      const avgConfidence = data.reduce((sum, calc) => sum + (calc.confidence_score || 0), 0) / data.length
      
      const scopeBreakdown = data.reduce((acc, calc) => {
        const scope = calc.scope || 'unknown'
        acc[scope] = (acc[scope] || 0) + (calc.total_emissions || 0)
        return acc
      }, {} as Record<string, number>)

      return {
        total_calculations: data.length,
        total_emissions: totalEmissions,
        average_confidence: avgConfidence,
        scope_breakdown: scopeBreakdown,
        latest_calculation: data[0]?.created_at
      }
    } catch (error) {
      console.error('Error fetching calculation stats:', error)
      throw error
    }
  }

  /**
   * Batch calculate emissions for multiple inputs
   */
  async batchCalculateEmissions(
    inputs: Array<{ raw_input: string; entry_id?: string }>,
    companyId: string
  ): Promise<RAGCalculationResult[]> {
    const results: RAGCalculationResult[] = []
    
    // Process in parallel but with some rate limiting
    const batchSize = 5
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize)
      
      const batchPromises = batch.map(input => 
        this.calculateEmissions({
          raw_input: input.raw_input,
          company_id: companyId,
          entry_id: input.entry_id
        })
      )

      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      } catch (error) {
        console.error(`Error in batch ${i / batchSize + 1}:`, error)
        // Continue with next batch even if one fails
      }

      // Small delay between batches
      if (i + batchSize < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }
}

export const ragEmissionsService = new RAGEmissionsService() 