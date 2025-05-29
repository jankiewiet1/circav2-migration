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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const startTime = Date.now()

    // Step 1: Parse input with GPT-4
    console.log('🔍 Parsing input with GPT-4:', raw_input)
    
    const parsePrompt = `You are an emissions data extractor. Parse the following text and return ONLY valid JSON with these exact fields:
{
  "category": "fuel|electricity|transport|heating|waste|water|other",
  "subcategory": "specific type (e.g., 'petrol EURO 95', 'natural gas', 'diesel')",
  "fuel_type": "if applicable (e.g., 'petrol', 'diesel', 'natural gas')",
  "quantity": number,
  "unit": "exact unit (L, kWh, km, m3, kg, etc.)",
  "description": "clean description for matching",
  "confidence": number between 0-1
}

Text to parse: "${raw_input}"`

    const parseResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a precise data extractor. Return only valid JSON." },
        { role: "user", content: parsePrompt }
      ],
      temperature: 0,
      max_tokens: 500
    })

    const parsedData: ParsedEmissionData = JSON.parse(parseResponse.choices[0]?.message?.content || '{}')
    console.log('📊 Parsed data:', parsedData)

    // Step 2: Generate embedding for similarity search
    console.log('🔍 Generating embedding for:', parsedData.description)
    
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${parsedData.category} ${parsedData.subcategory} ${parsedData.fuel_type} ${parsedData.description}`.trim()
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Step 3: Find similar emission factors using vector search
    console.log('🔍 Searching for similar emission factors...')
    
    const { data: similarFactors, error: searchError } = await supabaseClient
      .rpc('find_similar_emission_factors', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.6,
        max_results: 3
      })

    if (searchError) {
      console.error('❌ Vector search error:', searchError)
      throw new Error(`Vector search failed: ${searchError.message}`)
    }

    if (!similarFactors || similarFactors.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No matching emission factors found',
          parsed_data: parsedData,
          suggestion: 'Try a more specific description or check if the activity type is supported'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the best match (highest similarity)
    const bestMatch: EmissionFactor = similarFactors[0]
    console.log('✅ Best match found:', bestMatch)

    // Step 4: Calculate emissions
    const totalEmissions = parsedData.quantity * bestMatch.ef_value
    
    // Get detailed factors for breakdown (these columns don't exist in current table)
    // const { data: detailedFactor } = await supabaseClient
    //   .from('emission_factor_db')
    //   .select('co2_factor, ch4_factor, n2o_factor, scope')
    //   .eq('id', bestMatch.id)
    //   .single()

    // For now, we'll use the main factor and set breakdown to null
    const co2Emissions = null // detailedFactor?.co2_factor ? parsedData.quantity * detailedFactor.co2_factor : null
    const ch4Emissions = null // detailedFactor?.ch4_factor ? parsedData.quantity * detailedFactor.ch4_factor : null
    const n2oEmissions = null // detailedFactor?.n2o_factor ? parsedData.quantity * detailedFactor.n2o_factor : null

    // Determine scope from the scope field
    const scope = bestMatch.scope ? parseInt(bestMatch.scope.replace('Scope ', '')) : null

    // Step 5: Save calculation to database (skip in demo mode)
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
        emissions_unit: 'kg CO2e', // Default unit since we don't have ghg_unit in current table
        co2_emissions: co2Emissions,
        ch4_emissions: ch4Emissions,
        n2o_emissions: n2oEmissions,
        scope,
        confidence_score: parsedData.confidence * bestMatch.similarity, // Combined confidence
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

    // Step 6: Return comprehensive result
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
      unit: parsedData.unit
    } : {
      // Full result for authenticated users
      success: true,
      calculation_id: calculationId,
      parsed_data: parsedData,
      matched_factor: {
        id: bestMatch.id,
        description: bestMatch.description,
        source: bestMatch.source,
        similarity: bestMatch.similarity
      },
      calculation: {
        quantity: parsedData.quantity,
        unit: parsedData.unit,
        emission_factor: bestMatch.ef_value,
        emission_factor_unit: `kg CO2e/${parsedData.unit}`, // Construct unit
        total_emissions: totalEmissions,
        emissions_unit: 'kg CO2e',
        breakdown: {
          co2: co2Emissions,
          ch4: ch4Emissions,
          n2o: n2oEmissions
        },
        scope,
        confidence: parsedData.confidence * bestMatch.similarity
      },
      processing_time_ms: Date.now() - startTime,
      alternative_matches: similarFactors.slice(1) // Show other options
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