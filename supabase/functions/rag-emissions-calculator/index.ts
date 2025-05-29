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
  description: string;
  total_factor: number;
  unit: string;
  ghg_unit: string;
  scope: string;
  source: string;
  similarity: number;
  co2_factor?: number;
  ch4_factor?: number;
  n2o_factor?: number;
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
    const { raw_input, company_id, entry_id } = await req.json()

    if (!raw_input || !company_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: raw_input, company_id' }),
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
    const totalEmissions = parsedData.quantity * bestMatch.total_factor
    
    // Get detailed factors for breakdown
    const { data: detailedFactor } = await supabaseClient
      .from('emission_factor_db')
      .select('co2_factor, ch4_factor, n2o_factor, scope')
      .eq('id', bestMatch.id)
      .single()

    const co2Emissions = detailedFactor?.co2_factor ? parsedData.quantity * detailedFactor.co2_factor : null
    const ch4Emissions = detailedFactor?.ch4_factor ? parsedData.quantity * detailedFactor.ch4_factor : null
    const n2oEmissions = detailedFactor?.n2o_factor ? parsedData.quantity * detailedFactor.n2o_factor : null

    // Determine scope
    const scope = detailedFactor?.scope ? parseInt(detailedFactor.scope.replace('Scope ', '')) : null

    // Step 5: Save calculation to database
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
      emission_factor: bestMatch.total_factor,
      total_emissions: totalEmissions,
      emissions_unit: bestMatch.ghg_unit,
      co2_emissions: co2Emissions,
      ch4_emissions: ch4Emissions,
      n2o_emissions: n2oEmissions,
      scope,
      confidence_score: parsedData.confidence * bestMatch.similarity, // Combined confidence
      gpt_model_used: 'gpt-4o-mini',
      embedding_model_used: 'text-embedding-ada-002',
      processing_time_ms: Date.now() - startTime
    }

    const { data: savedCalculation, error: saveError } = await supabaseClient
      .from('emission_calc_rag')
      .insert(calculationData)
      .select()
      .single()

    if (saveError) {
      console.error('❌ Save error:', saveError)
      throw new Error(`Failed to save calculation: ${saveError.message}`)
    }

    console.log('✅ Calculation saved successfully')

    // Step 6: Return comprehensive result
    const result = {
      success: true,
      calculation_id: savedCalculation.id,
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
        emission_factor: bestMatch.total_factor,
        emission_factor_unit: bestMatch.ghg_unit,
        total_emissions: totalEmissions,
        emissions_unit: bestMatch.ghg_unit,
        breakdown: {
          co2: co2Emissions,
          ch4: ch4Emissions,
          n2o: n2oEmissions
        },
        scope,
        confidence: calculationData.confidence_score
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