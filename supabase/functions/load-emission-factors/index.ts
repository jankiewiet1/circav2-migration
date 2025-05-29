import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.28.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmissionFactorRow {
  source: string;
  category_1?: string;
  category_2?: string;
  category_3?: string;
  category_4?: string;
  subcategory?: string;
  fuel_type?: string;
  description: string;
  unit: string;
  ghg_unit: string;
  co2_factor?: number;
  ch4_factor?: number;
  n2o_factor?: number;
  total_factor: number;
  year_published?: number;
  region?: string;
  scope?: string;
  activity_type?: string;
}

interface ProcessingResult {
  success: boolean;
  error?: string;
  id?: string;
  row_index: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY') ?? '',
    })

    const { csv_data, batch_size = 50 } = await req.json()

    if (!csv_data || !Array.isArray(csv_data)) {
      return new Response(
        JSON.stringify({ error: 'csv_data must be an array of emission factor objects' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🚀 Starting to process ${csv_data.length} emission factors...`)

    let processed = 0
    let errors = 0
    const results: ProcessingResult[] = []
    const startTime = Date.now()

    // Process in batches to avoid rate limits
    for (let i = 0; i < csv_data.length; i += batch_size) {
      const batch = csv_data.slice(i, i + batch_size)
      console.log(`📦 Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(csv_data.length / batch_size)}`)

      const batchPromises = batch.map(async (row: EmissionFactorRow, index: number): Promise<ProcessingResult> => {
        try {
          // Create description for embedding
          const embeddingText = [
            row.category_1,
            row.category_2,
            row.category_3,
            row.category_4,
            row.subcategory,
            row.fuel_type,
            row.description,
            row.activity_type
          ].filter(Boolean).join(' ')

          // Generate embedding
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: embeddingText
          })

          const embedding = embeddingResponse.data[0].embedding

          // Prepare data for insertion
          const factorData = {
            source: row.source || 'Unknown',
            category_1: row.category_1,
            category_2: row.category_2,
            category_3: row.category_3,
            category_4: row.category_4,
            subcategory: row.subcategory,
            fuel_type: row.fuel_type,
            description: row.description,
            unit: row.unit,
            ghg_unit: row.ghg_unit,
            co2_factor: row.co2_factor,
            ch4_factor: row.ch4_factor,
            n2o_factor: row.n2o_factor,
            total_factor: row.total_factor,
            year_published: row.year_published,
            region: row.region || 'Global',
            scope: row.scope,
            activity_type: row.activity_type,
            embedding: embedding
          }

          // Insert into database
          const { data, error } = await supabaseClient
            .from('emission_factor_db')
            .insert(factorData)
            .select('id')
            .single()

          if (error) {
            console.error(`❌ Error inserting row ${i + index}:`, error)
            return { success: false, error: error.message, row_index: i + index }
          }

          console.log(`✅ Processed row ${i + index + 1}/${csv_data.length}`)
          return { success: true, id: data.id, row_index: i + index }

        } catch (error) {
          console.error(`❌ Error processing row ${i + index}:`, error)
          return { success: false, error: error.message, row_index: i + index }
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Count results
      const batchProcessed = batchResults.filter(r => r.success).length
      const batchErrors = batchResults.filter(r => !r.success).length
      
      processed += batchProcessed
      errors += batchErrors

      console.log(`📊 Batch complete: ${batchProcessed} processed, ${batchErrors} errors`)

      // Small delay between batches to respect rate limits
      if (i + batch_size < csv_data.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Create vector index if it doesn't exist
    try {
      await supabaseClient.rpc('create_vector_index_if_not_exists')
    } catch (indexError) {
      console.warn('⚠️ Could not create vector index:', indexError)
    }

    const summary = {
      success: true,
      total_rows: csv_data.length,
      processed,
      errors,
      success_rate: `${((processed / csv_data.length) * 100).toFixed(1)}%`,
      failed_rows: results.filter(r => !r.success).map(r => r.row_index),
      processing_time_seconds: Math.round((Date.now() - startTime) / 1000)
    }

    console.log('🎉 Processing complete:', summary)

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Load Emission Factors Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 