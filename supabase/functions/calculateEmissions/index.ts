import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { getConfig } from '../config.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use config for credentials
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getConfig()
    let { batchSize = 100 } = await req.json().catch(() => ({}))
    if (!batchSize) batchSize = 100
    console.log(`Processing batch size: ${batchSize}`)

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    let totalProcessed = 0
    let totalSuccessful = 0
    let totalFailed = 0
    let allResults = []
    let hasMore = true
    while (hasMore) {
      // Get entries without calculations
      const { data: entries, error: fetchError } = await supabaseClient
        .rpc('get_entries_without_calculations', { batch_limit: batchSize })

      if (fetchError) {
        console.error('Error fetching entries:', fetchError)
        throw fetchError
      }

      if (!entries || entries.length === 0) {
        hasMore = false
        break
      }

      // Helper to fetch all GHG types for a matched factor
      async function fetchGHGFactors(categoryMatch, uom, source) {
        const { data: ghgRows, error: ghgError } = await supabaseClient
          .from('emission_factors')
          .select('*')
          .eq('category_3', categoryMatch)
          .eq('uom', uom)
          .eq('Source', source)
        if (ghgError) throw ghgError
        return ghgRows
      }

      // Process entries
      const results = await Promise.all(
        entries.map(async (entry) => {
          try {
            // 1. Try RIVM, fallback to DEFRA
            let matchSource = 'RIVM'
            let matchResult = await supabaseClient.rpc('match_emission_factors', {
              query_embedding: entry.embedding,
              match_threshold: 0.7,
              match_count: 1,
              source_filter: matchSource
            })
            if (!matchResult.data || matchResult.data.length === 0) {
              matchSource = 'DEFRA'
              matchResult = await supabaseClient.rpc('match_emission_factors', {
                query_embedding: entry.embedding,
                match_threshold: 0.7,
                match_count: 1,
                source_filter: matchSource
              })
              if (!matchResult.data || matchResult.data.length === 0) {
                return { id: entry.id, success: false, error: 'No matching factors found' }
              }
            }
            const matched = matchResult.data[0]

            // 2. Fetch all GHG types for the matched category/unit/source
            const ghgRows = await fetchGHGFactors(matched.category_3, entry.unit, matchSource)
            // Map GHG/Unit to factors
            const co2Row = ghgRows.find(r => r["GHG/Unit"]?.includes('CO2'))
            const ch4Row = ghgRows.find(r => r["GHG/Unit"]?.includes('CH4'))
            const n2oRow = ghgRows.find(r => r["GHG/Unit"]?.includes('N2O'))

            const co2Factor = co2Row ? co2Row["GHG Conversion Factor"] : 0
            const ch4Factor = ch4Row ? ch4Row["GHG Conversion Factor"] : 0
            const n2oFactor = n2oRow ? n2oRow["GHG Conversion Factor"] : 0

            // 3. Calculate emissions
            const co2Emissions = entry.quantity * co2Factor
            const ch4Emissions = entry.quantity * ch4Factor
            const n2oEmissions = entry.quantity * n2oFactor
            const totalEmissions = co2Emissions + ch4Emissions + n2oEmissions

            // 4. Store results
            const { error: saveError } = await supabaseClient
              .from('emission_calculations')
              .insert({
                entry_id: entry.id,
                company_id: entry.company_id,
                date: entry.date,
                co2_factor: co2Factor,
                ch4_factor: ch4Factor,
                n2o_factor: n2oFactor,
                co2_emissions: co2Emissions,
                ch4_emissions: ch4Emissions,
                n2o_emissions: n2oEmissions,
                total_emissions: totalEmissions,
                source: matchSource,
                status: 'matched',
                calculated_at: new Date().toISOString(),
                emission_factor_id: matched.id
              })
            if (saveError) throw saveError

            return { id: entry.id, success: true, source: matchSource }
          } catch (error) {
            console.error(`Error processing entry ${entry.id}:`, error)
            return { id: entry.id, success: false, error: error.message }
          }
        })
      )

      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      totalProcessed += entries.length
      totalSuccessful += successful
      totalFailed += failed
      allResults = allResults.concat(results)
      // If less than batchSize, we're done
      if (entries.length < batchSize) hasMore = false
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${totalProcessed} entries`,
        successful: totalSuccessful,
        failed: totalFailed,
        results: allResults
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