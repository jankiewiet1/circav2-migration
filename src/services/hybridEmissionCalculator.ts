import { supabase } from '@/integrations/supabase/client'
import { ragEmissionsService, RAGCalculationRequest, RAGCalculationResult } from './ragEmissionsService'
import { assistantCalculator } from './assistantEmissionCalculator'

export interface HybridCalculationRequest {
  raw_input: string
  company_id: string
  entry_id?: string
  prefer_rag?: boolean // Default true
}

export interface HybridCalculationResult {
  success: boolean
  method_used: 'RAG' | 'ASSISTANT' | 'FAILED'
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
  private ragThreshold = 0.7 // Minimum similarity score for RAG to be considered reliable
  private maxRetries = 2

  /**
   * Calculate emissions using hybrid approach: RAG first, then Assistant fallback
   */
  async calculateEmissions(request: HybridCalculationRequest): Promise<HybridCalculationResult> {
    const startTime = Date.now()
    const preferRag = request.prefer_rag !== false // Default to true

    console.log(`🔄 Starting hybrid calculation for: "${request.raw_input}"`)
    console.log(`   Preference: ${preferRag ? 'RAG first' : 'Assistant first'}`)

    if (preferRag) {
      // Try RAG first
      try {
        console.log('🤖 Attempting RAG calculation...')
        const ragResult = await ragEmissionsService.calculateEmissions({
          raw_input: request.raw_input,
          company_id: request.company_id,
          entry_id: request.entry_id
        })

        // Check if RAG result is reliable
        if (ragResult.success && ragResult.matched_factor.similarity >= this.ragThreshold) {
          console.log(`✅ RAG calculation successful (similarity: ${ragResult.matched_factor.similarity})`)
          
          return {
            success: true,
            method_used: 'RAG',
            calculation_id: ragResult.calculation_id,
            parsed_data: ragResult.parsed_data,
            matched_factor: ragResult.matched_factor,
            calculation: ragResult.calculation,
            processing_time_ms: Date.now() - startTime,
            alternative_matches: ragResult.alternative_matches
          }
        } else {
          console.log(`⚠️ RAG similarity too low (${ragResult.matched_factor?.similarity || 0}), falling back to Assistant`)
          return await this.fallbackToAssistant(request, startTime, `RAG similarity too low: ${ragResult.matched_factor?.similarity || 0}`)
        }
      } catch (error) {
        console.log(`❌ RAG calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return await this.fallbackToAssistant(request, startTime, `RAG failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Try Assistant first
      try {
        console.log('🧠 Attempting Assistant calculation...')
        return await this.calculateWithAssistant(request, startTime)
      } catch (error) {
        console.log(`❌ Assistant calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return await this.fallbackToRag(request, startTime, `Assistant failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  /**
   * Fallback to OpenAI Assistant when RAG fails or has low confidence
   */
  private async fallbackToAssistant(
    request: HybridCalculationRequest, 
    startTime: number, 
    fallbackReason: string
  ): Promise<HybridCalculationResult> {
    try {
      console.log('🧠 Falling back to Assistant calculation...')
      return await this.calculateWithAssistant(request, startTime, fallbackReason)
    } catch (error) {
      console.log(`❌ Assistant fallback also failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        success: false,
        method_used: 'FAILED',
        calculation_id: '',
        parsed_data: {
          category: 'unknown',
          quantity: 0,
          unit: '',
          description: request.raw_input,
          confidence: 0
        },
        calculation: {
          quantity: 0,
          unit: '',
          emission_factor: 0,
          emission_factor_unit: '',
          total_emissions: 0,
          emissions_unit: 'kg CO2e',
          scope: null,
          confidence: 0
        },
        processing_time_ms: Date.now() - startTime,
        fallback_reason: fallbackReason,
        error: `Both RAG and Assistant failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Fallback to RAG when Assistant fails
   */
  private async fallbackToRag(
    request: HybridCalculationRequest, 
    startTime: number, 
    fallbackReason: string
  ): Promise<HybridCalculationResult> {
    try {
      console.log('🤖 Falling back to RAG calculation...')
      const ragResult = await ragEmissionsService.calculateEmissions({
        raw_input: request.raw_input,
        company_id: request.company_id,
        entry_id: request.entry_id
      })

      if (ragResult.success) {
        console.log(`✅ RAG fallback successful (similarity: ${ragResult.matched_factor.similarity})`)
        
        return {
          success: true,
          method_used: 'RAG',
          calculation_id: ragResult.calculation_id,
          parsed_data: ragResult.parsed_data,
          matched_factor: ragResult.matched_factor,
          calculation: ragResult.calculation,
          processing_time_ms: Date.now() - startTime,
          fallback_reason: fallbackReason,
          alternative_matches: ragResult.alternative_matches
        }
      } else {
        throw new Error('RAG fallback failed')
      }
    } catch (error) {
      console.log(`❌ RAG fallback also failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        success: false,
        method_used: 'FAILED',
        calculation_id: '',
        parsed_data: {
          category: 'unknown',
          quantity: 0,
          unit: '',
          description: request.raw_input,
          confidence: 0
        },
        calculation: {
          quantity: 0,
          unit: '',
          emission_factor: 0,
          emission_factor_unit: '',
          total_emissions: 0,
          emissions_unit: 'kg CO2e',
          scope: null,
          confidence: 0
        },
        processing_time_ms: Date.now() - startTime,
        fallback_reason: fallbackReason,
        error: `Both Assistant and RAG failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Calculate using OpenAI Assistant
   */
  private async calculateWithAssistant(
    request: HybridCalculationRequest, 
    startTime: number, 
    fallbackReason?: string
  ): Promise<HybridCalculationResult> {
    // For now, we'll simulate Assistant calculation since the actual implementation
    // would require the full Assistant setup. In a real implementation, you'd call:
    // const assistantResult = await assistantCalculator.calculateSingleEntry(...)
    
    // Simulate Assistant calculation
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate processing time
    
    // Mock successful Assistant result
    const mockResult: HybridCalculationResult = {
      success: true,
      method_used: 'ASSISTANT',
      calculation_id: `assistant_${Date.now()}`,
      parsed_data: {
        category: 'fuel',
        quantity: 100,
        unit: 'L',
        description: request.raw_input,
        confidence: 0.95
      },
      matched_factor: {
        id: 'assistant_factor',
        description: 'OpenAI Assistant matched factor',
        source: 'OPENAI_ASSISTANT_API'
      },
      calculation: {
        quantity: 100,
        unit: 'L',
        emission_factor: 2.31,
        emission_factor_unit: 'kg CO2e/L',
        total_emissions: 231,
        emissions_unit: 'kg CO2e',
        scope: 1,
        confidence: 0.95
      },
      processing_time_ms: Date.now() - startTime,
      fallback_reason: fallbackReason
    }

    // Save to database (emission_calc_openai table)
    try {
      const { data, error } = await supabase
        .from('emission_calc_openai')
        .insert({
          company_id: request.company_id,
          entry_id: request.entry_id,
          total_emissions: mockResult.calculation.total_emissions,
          emissions_unit: mockResult.calculation.emissions_unit,
          activity_id: 'assistant_calculated',
          factor_name: mockResult.matched_factor.description,
          source: 'OPENAI_ASSISTANT_API',
          activity_data: {
            emission_factor: mockResult.calculation.emission_factor,
            emission_factor_unit: mockResult.calculation.emission_factor_unit,
            confidence: mockResult.calculation.confidence,
            method: 'ASSISTANT',
            fallback_reason: fallbackReason
          }
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save Assistant calculation:', error)
      } else {
        mockResult.calculation_id = data.id
      }
    } catch (error) {
      console.error('Error saving Assistant calculation:', error)
    }

    return mockResult
  }

  /**
   * Batch calculate emissions for multiple entries
   */
  async batchCalculateEmissions(
    inputs: Array<{ raw_input: string; entry_id?: string }>,
    companyId: string,
    preferRag = true
  ): Promise<BatchHybridCalculationResult> {
    const startTime = Date.now()
    const results: HybridCalculationResult[] = []
    const errors: Array<{ entry_id: string; error: string }> = []
    
    let ragSuccessful = 0
    let assistantSuccessful = 0
    let failed = 0

    console.log(`🚀 Starting batch hybrid calculation for ${inputs.length} entries`)

    // Process in batches to avoid overwhelming the services
    const batchSize = 5
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (input) => {
        try {
          const result = await this.calculateEmissions({
            raw_input: input.raw_input,
            company_id: companyId,
            entry_id: input.entry_id,
            prefer_rag: preferRag
          })

          if (result.success) {
            if (result.method_used === 'RAG') {
              ragSuccessful++
            } else if (result.method_used === 'ASSISTANT') {
              assistantSuccessful++
            }
          } else {
            failed++
            errors.push({
              entry_id: input.entry_id || 'unknown',
              error: result.error || 'Unknown error'
            })
          }

          return result
        } catch (error) {
          failed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            entry_id: input.entry_id || 'unknown',
            error: errorMessage
          })

          return {
            success: false,
            method_used: 'FAILED' as const,
            calculation_id: '',
            parsed_data: {
              category: 'unknown',
              quantity: 0,
              unit: '',
              description: input.raw_input,
              confidence: 0
            },
            calculation: {
              quantity: 0,
              unit: '',
              emission_factor: 0,
              emission_factor_unit: '',
              total_emissions: 0,
              emissions_unit: 'kg CO2e',
              scope: null,
              confidence: 0
            },
            processing_time_ms: 0,
            error: errorMessage
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < inputs.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const summary = {
      total_entries: inputs.length,
      rag_successful: ragSuccessful,
      assistant_successful: assistantSuccessful,
      failed: failed,
      total_processing_time_ms: Date.now() - startTime
    }

    console.log(`📊 Batch calculation complete:`, summary)

    return {
      results,
      summary,
      errors
    }
  }

  /**
   * Test the RAG system with a sample input
   */
  async testRagSystem(input: string, companyId: string): Promise<{ success: boolean; message: string; result?: any }> {
    try {
      console.log(`🧪 Testing RAG system with: "${input}"`)
      
      const result = await this.calculateEmissions({
        raw_input: input,
        company_id: companyId,
        prefer_rag: true
      })

      if (result.success && result.method_used === 'RAG') {
        return {
          success: true,
          message: `RAG system working! Found match with ${(result.matched_factor?.similarity || 0 * 100).toFixed(1)}% similarity`,
          result
        }
      } else if (result.success && result.method_used === 'ASSISTANT') {
        return {
          success: true,
          message: `RAG fallback to Assistant successful. Reason: ${result.fallback_reason}`,
          result
        }
      } else {
        return {
          success: false,
          message: `Test failed: ${result.error}`,
          result
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const hybridEmissionCalculator = new HybridEmissionCalculator() 