import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to wait between retries
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to retry operations with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0
  let delay = initialDelay

  while (true) {
    try {
      return await operation()
    } catch (error) {
      retries++
      if (retries >= maxRetries) {
        throw error
      }
      console.log(`Retry ${retries}/${maxRetries} after ${delay}ms`)
      await wait(delay)
      delay *= 2 // Exponential backoff
    }
  }
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get batchSize from request body, default to 10 if not provided
    const { batchSize = 10 } = await req.json()
    console.log(`Processing batch size: ${batchSize}`)

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
      throw new Error('Missing environment variables. Please check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY are set.')
    }

    console.log('Environment variables loaded successfully')

    // Create Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const openai = new OpenAIApi(
      new Configuration({
        apiKey: openaiApiKey,
      })
    )

    console.log('Supabase client initialized successfully')

    // Get entries without embeddings with retry
    const { data: entries, error: fetchError } = await retryWithBackoff(async () => {
      const result = await supabaseClient
        .from('emission_entries')
        .select('id, category, description, notes')
        .is('embedding', null)
        .limit(batchSize)
      
      if (result.error) throw result.error
      return result
    })

    if (fetchError) {
      console.error('Error fetching entries:', fetchError)
      throw fetchError
    }

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No entries found without embeddings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${entries.length} entries to process`)

    // Process entries in parallel with retries
    const results = await Promise.all(
      entries.map(async (entry) => {
        try {
          const text = [
            entry.category,
            entry.description,
            entry.notes
          ].filter(Boolean).join(' - ')

          if (!text) {
            console.log(`Skipping entry ${entry.id} - no text to embed`)
            return { id: entry.id, success: false, error: 'No text to embed' }
          }

          const embeddingResponse = await retryWithBackoff(async () => {
            const response = await openai.createEmbedding({
              model: 'text-embedding-ada-002',
              input: text,
            })
            if (!response.data.data[0]?.embedding) {
              throw new Error('No embedding returned from OpenAI')
            }
            return response
          })

          const embedding = embeddingResponse.data.data[0].embedding

          // Update the entry with retry
          const { error: updateError } = await retryWithBackoff(async () => {
            const result = await supabaseClient
              .from('emission_entries')
              .update({ embedding })
              .eq('id', entry.id)
            
            if (result.error) throw result.error
            return result
          })

          if (updateError) {
            console.error(`Error updating entry ${entry.id}:`, updateError)
            return { id: entry.id, success: false, error: updateError.message }
          }

          return { id: entry.id, success: true }
        } catch (error) {
          console.error(`Error processing entry ${entry.id}:`, error)
          return { id: entry.id, success: false, error: error.message }
        }
      })
    )

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        message: `Processed ${entries.length} entries`,
        successful,
        failed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 