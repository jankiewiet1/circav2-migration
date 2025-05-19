import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EmissionEntry {
  id: string
  category_id: string
  quantity: number
  unit: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { id, category_id, quantity, unit } = await req.json() as EmissionEntry

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the emission factors for the category
    const { data: factors, error: factorsError } = await supabaseClient
      .from('emission_factors')
      .select('*')
      .eq('category_id', category_id)
      .single()

    if (factorsError) throw factorsError
    if (!factors) throw new Error('No emission factors found for category')

    // Calculate emissions
    const co2_emissions = quantity * factors.co2_conversion_factor
    const ch4_emissions = quantity * factors.ch4_conversion_factor
    const n2o_emissions = quantity * factors.n2o_conversion_factor
    const total_emissions = co2_emissions + ch4_emissions + n2o_emissions

    // Update the emission entry with calculated values
    const { error: updateError } = await supabaseClient
      .from('emission_entries')
      .update({
        co2_emissions,
        ch4_emissions,
        n2o_emissions,
        total_emissions,
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        co2_emissions,
        ch4_emissions,
        n2o_emissions,
        total_emissions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
}) 