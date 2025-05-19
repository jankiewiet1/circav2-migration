import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get batchSize from request body, default to 100 if not provided
    const { batchSize = 100 } = await req.json()
    console.log(`Processing batch of ${batchSize} records...`)

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
      throw new Error('Missing environment variables. Please check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY are set.')
    }

    console.log('Environment variables loaded successfully')

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Supabase client initialized successfully')

    // Get a batch of records without embeddings from emission_factors
    const { data: records, error: queryError } = await supabaseClient
      .from('emission_factors')
      .select('id, category_1, category_2, category_3, category_4')
      .is('embedding', null)
      .order('id')
      .limit(batchSize)

    if (queryError) {
      console.error('Query error:', queryError)
      throw new Error(`Database query error: ${queryError.message}`)
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0,
          message: 'No records found that need embeddings'
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    console.log(`Found ${records.length} records to process`)

    const results: Array<{ id: string; success: boolean; error?: string }> = []
    
    // Process records in parallel with a concurrency limit
    const concurrencyLimit = 10
    const chunks = []
    for (let i = 0; i < records.length; i += concurrencyLimit) {
      chunks.push(records.slice(i, i + concurrencyLimit))
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (record) => {
        try {
          if (!record.id) {
            console.warn('Record missing ID, skipping')
            return { id: record.id, success: false, error: 'Missing ID' }
          }

          // Combine all category fields into a single text
          const input = [
            record.category_1,
            record.category_2,
            record.category_3,
            record.category_4
          ].filter(Boolean).join(' - ')

          if (!input?.trim()) {
            console.warn(`Skipping record ${record.id}: No category text available`)
            return { id: record.id, success: false, error: 'No category text available' }
          }

          console.log(`Getting embedding for record ${record.id}: "${input}"`)

          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-ada-002',
              input: input
            })
          })

          if (!embeddingResponse.ok) {
            const errorText = await embeddingResponse.text()
            console.error(`OpenAI API error response:`, errorText)
            throw new Error(`OpenAI API error: ${errorText}`)
          }

          const embeddingData = await embeddingResponse.json()

          if (!embeddingData.data?.[0]?.embedding) {
            console.error('Invalid embedding response:', embeddingData)
            throw new Error('No embedding returned from OpenAI')
          }

          const embedding = embeddingData.data[0].embedding

          console.log(`Got embedding for record ${record.id}, updating database...`)

          const { error: updateError } = await supabaseClient
            .from('emission_factors')
            .update({ embedding })
            .eq('id', record.id)

          if (updateError) {
            console.error(`Update error for record ${record.id}:`, updateError)
            throw new Error(`Database update error: ${updateError.message}`)
          }

          return { id: record.id, success: true }
        } catch (recordError) {
          console.error(`Error processing record ${record.id}:`, recordError)
          return { 
            id: record.id, 
            success: false, 
            error: recordError instanceof Error ? recordError.message : String(recordError)
          }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)

      // Small delay between chunks to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : String(error)
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})

