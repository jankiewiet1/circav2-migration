// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getConfig } from "../config.ts";
import { climatiqBatchEstimate } from "./climatiq.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type"
};

// Mapping function: category/unit to Climatiq activity_id/parameter/unit
function mapEntryToClimatiq(entry: any) {
  switch (entry.category?.toLowerCase()) {
    case 'electricity':
    case 'electricity consumption from grid':
      return {
        activity_id: 'electricity-supply_grid-source_residual_mix',
        parameter: 'energy',
        unit: 'kWh'
      };
    case 'business goods':
      return {
        activity_id: 'freight_transport-goods_type_na-vehicle_type_na',
        parameter: 'weight',
        unit: 'Kg'
      };
    case 'district_heating':
      return {
        activity_id: 'district_heating-type_na',
        parameter: 'energy',
        unit: 'GJ'
      };
    case 'employee_commute':
    case 'company_vehicle_km':
      return {
        activity_id: 'passenger_vehicle-vehicle_type_car-fuel_source_na',
        parameter: 'distance',
        unit: 'km'
      };
    case 'shipping':
      return {
        activity_id: 'freight_transport-goods_type_na-vehicle_type_na',
        parameter: 'weight_distance',
        unit: 'kg-km'
      };
    case 'train_travel':
      return {
        activity_id: 'passenger_train-route_type_commuter_rail-fuel_source_na',
        parameter: 'distance',
        unit: 'km'
      };
    case 'water_usage':
      return {
        activity_id: 'water-supply',
        parameter: 'volume',
        unit: 'm3'
      };
    case 'purchased_steam':
      return {
        activity_id: 'steam-supply',
        parameter: 'weight',
        unit: 'tonnes'
      };
    case 'diesel':
      return {
        activity_id: 'fuel_combustion-fossil_diesel',
        parameter: 'fuel',
        unit: 'liters'
      };
    default:
      throw new Error(`No mapping for category: ${entry.category}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getConfig();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const batchSize = 100;
  let cursor: string | null = null;
  let hasMore = true;
  const results: any[] = [];

  while (hasMore) {
    const { data: entries, error: fetchErr } = await supabase.rpc("get_entries_without_calculations", {
      batch_limit: batchSize,
      cursor_id: cursor
    });
    if (fetchErr) throw fetchErr;
    if (!entries?.length) break;

    // Map entries to Climatiq batch requests, skipping entries with missing category
    const batchRequests = entries
      .filter((entry: any) => entry.category)
      .map((entry: any) => {
        const mapping = mapEntryToClimatiq(entry);
        return {
          emission_factor: {
            activity_id: mapping.activity_id,
            data_version: "^21",
          },
          parameters: {
            [mapping.parameter]: entry.quantity,
            [`${mapping.parameter}_unit`]: mapping.unit,
          }
        };
      });

    // Send batch to Climatiq
    let batchResponse;
    try {
      batchResponse = await climatiqBatchEstimate(batchRequests);
    } catch (err) {
      results.push({ error: err.message });
      break;
    }

    // Insert results into emission_calc_climatiq
    for (let i = 0; i < batchResponse.results.length; i++) {
      const result = batchResponse.results[i];
      const entry = entries[i];
      if (!result) continue;
      await supabase.from('emission_calc_climatiq').insert({
        company_id: entry.company_id,
        entry_id: entry.id,
        calculated_at: new Date().toISOString(),
        total_emissions: result.co2e,
        emissions_unit: result.co2e_unit,
        scope: entry.scope,
        climatiq_activity_id: result.emission_factor?.activity_id,
        climatiq_emissions_factor_id: result.emission_factor?.id,
        climatiq_factor_name: result.emission_factor?.name,
        climatiq_region: result.emission_factor?.region,
        climatiq_category: result.emission_factor?.category,
        climatiq_source: result.emission_factor?.source,
        climatiq_year: result.emission_factor?.year,
        co2_emissions: result.constituent_gases?.co2,
        ch4_emissions: result.constituent_gases?.ch4,
        n2o_emissions: result.constituent_gases?.n2o,
        activity_data: result.activity_data,
        request_params: batchRequests[i],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    results.push(...batchResponse.results.map((r: any, idx: number) => ({ id: entries[idx].id, success: true })));
    cursor = entries[entries.length - 1].id;
    hasMore = entries.length === batchSize;
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...CORS, "Content-Type": "application/json" }
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/calculate-emissions' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
