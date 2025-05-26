import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'
import { corsHeaders } from '../_shared/cors.ts'

interface EmissionFactorRequest {
  category_text: string
  source: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { category_text, source } = await req.json() as EmissionFactorRequest

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create OpenAI client
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Get embedding for the category text
    const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: category_text,
    })

    if (!embeddingResponse.data?.data?.[0]?.embedding) {
      throw new Error('Failed to generate embedding')
    }

    const embedding = embeddingResponse.data.data[0].embedding

    // Match against the appropriate source table
    const tableName = source.toLowerCase() === 'rivm' ? 'categories_rivm' : 'categories_defra'
    
    // Use the match_categories function to find similar categories
    const { data: matches, error } = await supabaseClient
      .rpc('match_categories', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 1,
        table_name: tableName
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ matches }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
}) 