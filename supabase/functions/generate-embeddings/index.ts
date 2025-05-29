import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

interface EmissionFactor {
  id: string
  Activity: string
  Fuel?: string
  Country?: string
  GHG?: string
  EF_Value: string
  Unit: string
  Source: string
}

function classifyScope(activity: string): string {
  const activityLower = activity.toLowerCase()
  
  // Scope 1: Direct emissions from owned or controlled sources
  if (activityLower.includes('fuel combustion') || 
      activityLower.includes('stationary') || 
      activityLower.includes('mobile') ||
      activityLower.includes('1.a') ||
      activityLower.includes('fugitive') ||
      activityLower.includes('process') ||
      activityLower.includes('agriculture') ||
      activityLower.includes('forestry') ||
      activityLower.includes('land use')) {
    return 'Scope 1'
  }
  
  // Scope 2: Indirect emissions from purchased energy
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') || 
      activityLower.includes('steam') ||
      activityLower.includes('2.') ||
      activityLower.includes('energy consumption') ||
      activityLower.includes('grid')) {
    return 'Scope 2'
  }
  
  // Scope 3: All other indirect emissions
  return 'Scope 3'
}

function createDescription(record: EmissionFactor): string {
  const parts: string[] = []
  
  if (record.Activity) parts.push(record.Activity)
  if (record.Fuel && record.Fuel.trim()) parts.push(`Fuel: ${record.Fuel}`)
  if (record.Country && record.Country.trim()) parts.push(`Country: ${record.Country}`)
  if (record.GHG && record.GHG.trim()) parts.push(`Gas: ${record.GHG}`)
  if (record.Unit) parts.push(`Unit: ${record.Unit}`)
  if (record.Source) parts.push(`Source: ${record.Source}`)
  
  return parts.join(' | ')
}

async function generateBatchEmbeddings(texts: string[]): Promise<number[][] | null> {
  try {
    console.log(`Generating embeddings for ${texts.length} texts using batch API...`)
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: texts, // Send all texts at once for maximum efficiency
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data.data.map((item: any) => item.embedding)
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { batchSize = 500, recordIds } = await req.json()
    
    // Optimize batch size for Pro plan (max 500 for best performance)
    const safeBatchSize = Math.min(batchSize, 500)
    
    let query = supabase
      .from('emission_factor_db')
      .select('*')
      .is('embedding', null) // Only process records without embeddings
    
    // If specific record IDs provided, filter by them
    if (recordIds && recordIds.length > 0) {
      query = query.in('id', recordIds)
    }
    
    const { data: records, error: fetchError } = await query.limit(safeBatchSize)
    
    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`)
    }
    
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No records need embedding generation',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`Processing ${records.length} records in optimized batch...`)
    
    // Prepare all descriptions for batch processing
    const descriptions = records.map(record => createDescription(record))
    
    // Generate all embeddings in one API call (most efficient)
    const embeddings = await generateBatchEmbeddings(descriptions)
    
    if (!embeddings || embeddings.length !== records.length) {
      throw new Error('Failed to generate embeddings for all records')
    }
    
    console.log(`Generated ${embeddings.length} embeddings, updating database...`)
    
    let updated = 0
    let errors = 0
    
    // Update all records with their embeddings and scope
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const embedding = embeddings[i]
      const description = descriptions[i]
      const scope = classifyScope(record.Activity)
      
      try {
        const { error: updateError } = await supabase
          .from('emission_factor_db')
          .update({
            embedding: embedding,
            description: description,
            scope: scope,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`Error updating record ${record.id}:`, updateError)
          errors++
        } else {
          updated++
        }
        
      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error)
        errors++
      }
    }
    
    console.log(`Batch complete: ${updated} updated, ${errors} errors`)
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: records.length,
        updated,
        errors,
        message: `Processed ${records.length} records. Updated: ${updated}, Errors: ${errors}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error in generate-embeddings function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 