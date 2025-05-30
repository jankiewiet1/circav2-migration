import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedEmissionData {
  category: string;
  subcategory?: string;
  fuel_type?: string;
  quantity: number;
  unit: string;
  description: string;
  confidence: number;
}

interface EmissionFactor {
  id: string;
  activity: string;
  fuel: string;
  country: string;
  ghg: string;
  ef_value: number;
  unit: string;
  source: string;
  description: string;
  scope: string;
  similarity: number;
}

// Validation ranges for common emission factors (kg CO2e per unit)
const VALIDATION_RANGES = {
  // Fuels (per liter)
  'diesel': { min: 0.15, max: 0.35, unit: 'L' },
  'petrol': { min: 0.15, max: 0.30, unit: 'L' },
  'gasoline': { min: 0.15, max: 0.30, unit: 'L' },
  'fuel oil': { min: 0.20, max: 0.40, unit: 'L' },
  
  // Electricity (per kWh)
  'electricity': { min: 0.10, max: 1.50, unit: 'kWh' },
  'electric': { min: 0.10, max: 1.50, unit: 'kWh' },
  
  // Natural gas (per m3)
  'natural gas': { min: 1.50, max: 2.50, unit: 'm3' },
  'gas': { min: 1.50, max: 2.50, unit: 'm3' },
  
  // Transport (per km) - very rough ranges
  'flight': { min: 0.08, max: 0.50, unit: 'km' },
  'car': { min: 0.05, max: 0.40, unit: 'km' },
  'vehicle': { min: 0.05, max: 0.40, unit: 'km' },
}

// Rate limiting configuration
const RATE_LIMITS = {
  CALCULATIONS_PER_HOUR: 50,  // Per authenticated user
  CALCULATIONS_PER_DAY: 200,  // Per authenticated user  
  DEMO_PER_IP_PER_HOUR: 10,  // For demo mode per IP
  GLOBAL_PER_MINUTE: 100      // Global across all users
}

function normalizeQuery(input: string): string {
  return input.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractKeyTerms(parsedData: ParsedEmissionData): string[] {
  const terms = []
  
  if (parsedData.fuel_type) terms.push(parsedData.fuel_type)
  if (parsedData.subcategory) terms.push(parsedData.subcategory)
  if (parsedData.category) terms.push(parsedData.category)
  
  // Add unit-specific context
  const unit = parsedData.unit.toLowerCase()
  if (['l', 'liter', 'litre'].includes(unit)) {
    terms.push('liquid fuel')
  } else if (['kwh', 'mwh'].includes(unit)) {
    terms.push('electricity')
  } else if (['m3', 'cubic meter'].includes(unit)) {
    terms.push('gas')
  } else if (['km', 'mile'].includes(unit)) {
    terms.push('transport')
  }
  
  return terms
}

function validateEmissionFactor(factor: EmissionFactor, parsedData: ParsedEmissionData): boolean {
  const normalizedDescription = normalizeQuery(factor.description)
  const factorValue = factor.ef_value
  const unit = parsedData.unit.toLowerCase()
  
  // Check validation ranges
  for (const [key, range] of Object.entries(VALIDATION_RANGES)) {
    if (normalizedDescription.includes(key.toLowerCase()) && 
        (unit.includes(range.unit.toLowerCase()) || range.unit.toLowerCase().includes(unit))) {
      
      if (factorValue < range.min || factorValue > range.max) {
        console.log(`❌ Validation failed: ${key} factor ${factorValue} outside range ${range.min}-${range.max} for unit ${range.unit}`)
        return false
      }
    }
  }
  
  // Additional reasonableness checks
  if (factorValue < 0 || factorValue > 100) {
    console.log(`❌ Validation failed: Factor ${factorValue} is unreasonably high/low`)
    return false
  }
  
  return true
}

// Rate limiting helper functions
async function checkRateLimit(supabaseClient: any, userId: string | null, userIP: string, demo_mode: boolean) {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  
  try {
    if (demo_mode) {
      // Check demo rate limits by IP
      const { count: hourlyDemoCount, error: demoError } = await supabaseClient
        .from('emission_calc_rag')
        .select('*', { count: 'exact', head: true })
        .eq('raw_input', `demo:${userIP}`) // Use raw_input to track demo IP
        .gte('created_at', oneHourAgo.toISOString())
      
      if (demoError) throw demoError
      
      if (hourlyDemoCount >= RATE_LIMITS.DEMO_PER_IP_PER_HOUR) {
        return {
          allowed: false,
          error: `Demo rate limit exceeded: ${RATE_LIMITS.DEMO_PER_IP_PER_HOUR} calculations per hour per IP`,
          reset_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
        }
      }
    } else if (userId) {
      // Check authenticated user rate limits
      const { count: hourlyCount, error: hourlyError } = await supabaseClient
        .from('emission_calc_rag')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', userId) // Assuming company_id relates to user
        .gte('created_at', oneHourAgo.toISOString())
      
      if (hourlyError) throw hourlyError
      
      if (hourlyCount >= RATE_LIMITS.CALCULATIONS_PER_HOUR) {
        return {
          allowed: false,
          error: `Hourly rate limit exceeded: ${RATE_LIMITS.CALCULATIONS_PER_HOUR} calculations per hour`,
          reset_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
        }
      }
      
      const { count: dailyCount, error: dailyError } = await supabaseClient
        .from('emission_calc_rag')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', userId)
        .gte('created_at', oneDayAgo.toISOString())
      
      if (dailyError) throw dailyError
      
      if (dailyCount >= RATE_LIMITS.CALCULATIONS_PER_DAY) {
        return {
          allowed: false,
          error: `Daily rate limit exceeded: ${RATE_LIMITS.CALCULATIONS_PER_DAY} calculations per day`,
          reset_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    }
    
    // Check global rate limit
    const { count: globalCount, error: globalError } = await supabaseClient
      .from('emission_calc_rag')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneMinuteAgo.toISOString())
    
    if (globalError) throw globalError
    
    if (globalCount >= RATE_LIMITS.GLOBAL_PER_MINUTE) {
      return {
        allowed: false,
        error: 'Global rate limit exceeded. Please try again in a minute.',
        reset_time: new Date(now.getTime() + 60 * 1000).toISOString()
      }
    }
    
    return { allowed: true }
    
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // If rate limit check fails, allow the request but log the error
    return { allowed: true }
  }
}

async function logRateLimitUsage(supabaseClient: any, userId: string | null, userIP: string, demo_mode: boolean) {
  // For demo mode, we'll use a special tracking method
  if (demo_mode) {
    try {
      await supabaseClient
        .from('emission_calc_rag')
        .insert({
          company_id: '00000000-0000-0000-0000-000000000000', // Special UUID for demo
          raw_input: `demo:${userIP}`,
          parsed_data: { demo: true, ip: userIP },
          quantity: 0,
          unit: 'demo',
          emission_factor: 0,
          total_emissions: 0,
          processing_time_ms: 0
        })
    } catch (error) {
      console.error('Failed to log demo usage:', error)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract user IP for rate limiting
    const userIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   req.headers.get('cf-connecting-ip') ||
                   'unknown'

    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    // Parse request
    const { raw_input, company_id, entry_id, demo_mode } = await req.json()

    if (!raw_input) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: raw_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For demo mode, company_id is not required
    if (!demo_mode && !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: company_id (unless in demo_mode)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(supabaseClient, company_id, userIP, demo_mode)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: rateLimitResult.error,
          reset_time: rateLimitResult.reset_time,
          rate_limits: {
            calculations_per_hour: RATE_LIMITS.CALCULATIONS_PER_HOUR,
            calculations_per_day: RATE_LIMITS.CALCULATIONS_PER_DAY,
            demo_per_ip_per_hour: RATE_LIMITS.DEMO_PER_IP_PER_HOUR
          }
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startTime = Date.now()

    // Step 1: Parse input with GPT-4 - Enhanced prompt for better consistency
    console.log('🔍 Parsing input with GPT-4:', raw_input)
    
    const parsePrompt = `You are an emissions data extractor. Parse the following text and return ONLY valid JSON with these exact fields:
{
  "category": "fuel|electricity|transport|heating|waste|water|other",
  "subcategory": "specific type (e.g., 'diesel', 'petrol', 'natural gas', 'electricity grid')",
  "fuel_type": "if applicable (e.g., 'diesel', 'petrol', 'natural gas')",
  "quantity": number,
  "unit": "exact unit (L, kWh, km, m3, kg, etc.)",
  "description": "clean, specific description for database matching (focus on fuel/energy type)",
  "confidence": number between 0-1
}

IMPORTANT: 
- For "description", be very specific about the fuel/energy type (e.g., "diesel fuel combustion", "electricity consumption", "petrol vehicle fuel")
- Normalize common terms (petrol = gasoline, L = liters, etc.)
- Extract the core activity type clearly

Text to parse: "${raw_input}"`

    const parseResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise data extractor. Return only valid JSON. Focus on extracting the specific fuel or energy type clearly." },
        { role: "user", content: parsePrompt }
      ],
      temperature: 0,
      max_tokens: 500
    })

    const parsedData: ParsedEmissionData = JSON.parse(parseResponse.choices[0]?.message?.content || '{}')
    console.log('📊 Parsed data:', parsedData)

    // Step 2: Generate optimized embedding for similarity search
    console.log('🔍 Generating optimized embedding...')
    
    // Create focused embedding input with key terms
    const keyTerms = extractKeyTerms(parsedData)
    const embeddingInput = [
      parsedData.description,
      ...keyTerms,
      parsedData.unit
    ].filter(Boolean).join(' ')
    
    console.log('🎯 Embedding input:', embeddingInput)
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: embeddingInput
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Step 3: Find similar emission factors with higher threshold
    console.log('🔍 Searching for similar emission factors with strict matching...')
    
    const { data: similarFactors, error: searchError } = await supabaseClient
      .rpc('find_similar_emission_factors', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.8, // Increased from 0.6 to 0.8 for more precise matching
        max_results: 5 // Get more options for validation
      })

    if (searchError) {
      console.error('❌ Vector search error:', searchError)
      throw new Error(`Vector search failed: ${searchError.message}`)
    }

    if (!similarFactors || similarFactors.length === 0) {
      // Fallback: try with lower threshold but more validation
      console.log('🔄 No high-similarity matches found, trying fallback search...')
      
      const { data: fallbackFactors, error: fallbackError } = await supabaseClient
        .rpc('find_similar_emission_factors', {
          query_embedding: queryEmbedding,
          similarity_threshold: 0.65, // Lower threshold for fallback
          max_results: 10
        })

      if (fallbackError || !fallbackFactors || fallbackFactors.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No matching emission factors found',
            parsed_data: parsedData,
            suggestion: 'Try a more specific description or check if the activity type is supported'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate fallback factors more strictly
      const validatedFactors = fallbackFactors.filter(factor => 
        validateEmissionFactor(factor, parsedData)
      )

      if (validatedFactors.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No validated emission factors found',
            parsed_data: parsedData,
            found_factors: fallbackFactors.length,
            suggestion: 'The available emission factors did not pass validation checks for this query'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      similarFactors = validatedFactors
    }

    // Step 4: Validate and select the best match
    let bestMatch: EmissionFactor | null = null
    
    for (const factor of similarFactors) {
      if (validateEmissionFactor(factor, parsedData)) {
        bestMatch = factor
        break
      }
    }

    if (!bestMatch) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid emission factors found after validation',
          parsed_data: parsedData,
          found_factors: similarFactors.length,
          validation_failed: 'All potential matches failed validation checks'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Best validated match found:', bestMatch)
    console.log(`📈 Similarity: ${bestMatch.similarity}, Factor: ${bestMatch.ef_value} kg CO2e/${parsedData.unit}`)

    // Step 5: Calculate emissions
    const totalEmissions = parsedData.quantity * bestMatch.ef_value
    
    // Determine scope from the scope field
    const scope = bestMatch.scope ? parseInt(bestMatch.scope.replace('Scope ', '')) : null

    // Step 6: Save calculation to database (skip in demo mode)
    let savedCalculation = null
    let calculationId = null

    if (!demo_mode) {
      const calculationData = {
        company_id,
        entry_id,
        raw_input,
        parsed_data: parsedData,
        query_embedding: queryEmbedding,
        matched_factor_id: bestMatch.id,
        similarity_score: bestMatch.similarity,
        quantity: parsedData.quantity,
        unit: parsedData.unit,
        emission_factor: bestMatch.ef_value,
        total_emissions: totalEmissions,
        emissions_unit: 'kg CO2e',
        co2_emissions: null,
        ch4_emissions: null,
        n2o_emissions: null,
        scope,
        confidence_score: parsedData.confidence * bestMatch.similarity,
        gpt_model_used: 'gpt-4o-mini',
        embedding_model_used: 'text-embedding-ada-002',
        processing_time_ms: Date.now() - startTime
      }

      const { data: calculation, error: saveError } = await supabaseClient
        .from('emission_calc_rag')
        .insert(calculationData)
        .select()
        .single()

      if (saveError) {
        console.error('❌ Save error:', saveError)
        throw new Error(`Failed to save calculation: ${saveError.message}`)
      }

      savedCalculation = calculation
      calculationId = calculation.id
      console.log('✅ Calculation saved successfully')
    } else {
      console.log('🎭 Demo mode: Skipping database save')
    }

    // Step 7: Return comprehensive result with validation info
    const result = demo_mode ? {
      // Simplified result for demo mode
      success: true,
      total_emissions: totalEmissions,
      emissions_unit: 'kg CO2e',
      emission_factor: bestMatch.ef_value,
      emission_factor_unit: `kg CO2e/${parsedData.unit}`,
      confidence_score: parsedData.confidence,
      similarity_score: bestMatch.similarity,
      source: bestMatch.source,
      matched_activity: bestMatch.description,
      processing_time_ms: Date.now() - startTime,
      quantity: parsedData.quantity,
      unit: parsedData.unit,
      validation_passed: true
    } : {
      // Full result for authenticated users
      success: true,
      calculation_id: calculationId,
      parsed_data: parsedData,
      matched_factor: {
        id: bestMatch.id,
        description: bestMatch.description,
        source: bestMatch.source,
        similarity: bestMatch.similarity,
        validation_passed: true
      },
      calculation: {
        quantity: parsedData.quantity,
        unit: parsedData.unit,
        emission_factor: bestMatch.ef_value,
        emission_factor_unit: `kg CO2e/${parsedData.unit}`,
        total_emissions: totalEmissions,
        emissions_unit: 'kg CO2e',
        breakdown: {
          co2: null,
          ch4: null,
          n2o: null
        },
        scope,
        confidence: parsedData.confidence * bestMatch.similarity
      },
      processing_time_ms: Date.now() - startTime,
      alternative_matches: similarFactors.slice(1).map(f => ({
        ...f,
        validation_passed: validateEmissionFactor(f, parsedData)
      }))
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ RAG Calculator Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 