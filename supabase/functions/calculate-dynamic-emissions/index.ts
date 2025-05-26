import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// API configuration
const CLIMATIQ_API_KEY = Deno.env.get("CLIMATIQ_API_KEY");
const CLIMATIQ_API_URL = "https://api.climatiq.io";
const CLIMATIQ_ESTIMATE_URL = `${CLIMATIQ_API_URL}/data/v1/estimate`;
const CLIMATIQ_BATCH_URL = `${CLIMATIQ_API_URL}/data/v1/estimate/batch`;
const CLIMATIQ_SEARCH_URL = `${CLIMATIQ_API_URL}/search`;

// CORS headers
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info"
};

// Helper: Create Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

// Smart mapping function to determine Climatiq activity IDs based on emission entry details
function determineClimatiqActivityId(entry: any) {
  const category = entry.category?.toLowerCase() || "";
  const unit = entry.unit?.toLowerCase() || "";
  const description = entry.description?.toLowerCase() || "";
  
  // Scope 1: Direct emissions
  if (entry.scope === 1) {
    // Stationary combustion
    if (category.includes("natural gas") || description.includes("natural gas")) {
      return {
        activity_id: "fuel_combustion-fossil_natural_gas",
        parameter: "energy",
        unit: unit.includes("kwh") ? "kWh" : unit.includes("mj") ? "MJ" : "m3"
      };
    }
    
    // Vehicle fuels
    if (category.includes("diesel") || description.includes("diesel")) {
      return {
        activity_id: "fuel_combustion-fossil_diesel",
        parameter: "fuel",
        unit: unit.includes("gal") ? "gal" : "L"
      };
    }
    
    if (category.includes("gasoline") || category.includes("petrol") || 
        description.includes("gasoline") || description.includes("petrol")) {
      return {
        activity_id: "fuel_combustion-fossil_gasoline",
        parameter: "fuel",
        unit: unit.includes("gal") ? "gal" : "L"
      };
    }
    
    // Company vehicles
    if (category.includes("vehicle") || category.includes("car") || 
        description.includes("vehicle") || description.includes("car")) {
      return {
        activity_id: "passenger_vehicle-vehicle_type_car-fuel_source_na",
        parameter: "distance",
        unit: unit.includes("mi") ? "mi" : "km"
      };
    }
  }
  
  // Scope 2: Indirect emissions from purchased energy
  if (entry.scope === 2) {
    if (category.includes("electricity") || description.includes("electricity")) {
      return {
        activity_id: "electricity-supply_grid-source_residual_mix",
        parameter: "energy",
        unit: "kWh"
      };
    }
    
    if (category.includes("heat") || category.includes("steam") || 
        description.includes("heat") || description.includes("steam")) {
      return {
        activity_id: "district_heating-type_na",
        parameter: "energy",
        unit: unit.includes("kwh") ? "kWh" : "MJ"
      };
    }
  }
  
  // Scope 3: Other indirect emissions
  if (entry.scope === 3) {
    // Business travel
    if (category.includes("flight") || category.includes("air travel") || 
        description.includes("flight") || description.includes("air travel")) {
      return {
        activity_id: "passenger_flight-route_type_domestic-aircraft_type_na-distance_na-class_na",
        parameter: "distance",
        unit: unit.includes("mi") ? "mi" : "km"
      };
    }
    
    // Employee commuting
    if (category.includes("commute") || description.includes("commute")) {
      return {
        activity_id: "passenger_vehicle-vehicle_type_car-fuel_source_na",
        parameter: "distance",
        unit: unit.includes("mi") ? "mi" : "km"
      };
    }
    
    // Purchased goods & services
    if (category.includes("purchased") || category.includes("goods") || 
        description.includes("purchased") || description.includes("goods")) {
      return {
        activity_id: "purchased_goods_services-type_na",
        parameter: "money",
        unit: "usd"
      };
    }
    
    // Waste
    if (category.includes("waste") || description.includes("waste")) {
      return {
        activity_id: "waste-type_solid_waste-disposal_method_landfilled",
        parameter: "weight",
        unit: unit.includes("lb") ? "lb" : "kg"
      };
    }
  }
  
  // Default generic mapping
  return {
    activity_id: "fuel_combustion-fossil_na",
    parameter: "energy",
    unit: "kWh"
  };
}

// Function to process emissions calculations for a batch of entries
async function processBatchCalculations(entries: any[]) {
  if (!CLIMATIQ_API_KEY || entries.length === 0) {
    return { results: [], errors: ["No API key or entries to process"] };
  }
  
  // Map entries to Climatiq API request format
  const batchRequests = entries.map(entry => {
    const mapping = determineClimatiqActivityId(entry);
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
  
  try {
    // Call Climatiq API for batch calculation
    const response = await fetch(CLIMATIQ_BATCH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLIMATIQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(batchRequests)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Climatiq API error: ${response.status} - ${errorData}`);
    }
    
    const batchResults = await response.json();
    
    // Save results to the database
    const supabase = getSupabaseClient();
    const calculationResults = [];
    
    for (let i = 0; i < Math.min(entries.length, batchResults.results.length); i++) {
      const entry = entries[i];
      const result = batchResults.results[i];
      
      if (!result) continue;
      
      // Save calculation to database
      const { data, error } = await supabase.from('emission_calc_climatiq').upsert({
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
      
      if (error) {
        console.error("Error saving calculation:", error);
      } else {
        // Update the match_status in emission_entries
        await supabase
          .from('emission_entries')
          .update({ match_status: 'matched' })
          .eq('id', entry.id);
        
        calculationResults.push({
          entry_id: entry.id,
          category: entry.category,
          emissions: result.co2e,
          emissions_unit: result.co2e_unit,
          source: result.emission_factor?.source || 'unknown',
          success: true
        });
      }
    }
    
    return { results: calculationResults, errors: [] };
  } catch (error) {
    console.error("Error processing batch calculations:", error);
    return { 
      results: [], 
      errors: [`Failed to process calculations: ${error.message}`] 
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Basic parameter validation
  if (!CLIMATIQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing Climatiq API key configuration" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }

  try {
    const requestData = await req.json();
    const { company_id, entry_ids } = requestData;
    
    if (!company_id) {
      return new Response(JSON.stringify({ error: "Missing company_id parameter" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    const supabase = getSupabaseClient();
    
    // Query for entries without calculations or with specific IDs
    // Limit to 5 entries for testing purposes
    let query = supabase
      .from('emission_entries')
      .select('*, emission_calc_climatiq(*)')
      .eq('company_id', company_id)
      .limit(5); // TESTING: Limit to 5 entries
      
    if (entry_ids && Array.isArray(entry_ids) && entry_ids.length > 0) {
      // If specific entries are requested, use them
      query = query.in('id', entry_ids);
    } else {
      // Otherwise, get entries that need calculation
      query = query.or('match_status.is.null,match_status.eq.unmatched');
    }
    
    const { data: entries, error: fetchError } = await query;
    
    if (fetchError) {
      return new Response(JSON.stringify({ error: `Database query error: ${fetchError.message}` }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No entries found requiring calculation",
        processed: 0
      }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    // Filter entries without calculations
    const entriesToProcess = entries.filter(entry => 
      !entry.emission_calc_climatiq || entry.emission_calc_climatiq.length === 0
    );
    
    if (entriesToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        message: "All entries already have calculations",
        processed: 0
      }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    // Process the entries
    const { results, errors } = await processBatchCalculations(entriesToProcess);
    
    return new Response(JSON.stringify({ 
      processed: entriesToProcess.length,
      calculated: results.length,
      results,
      errors
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
}); 