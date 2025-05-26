/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("get-dashboard-summary function initializing");

// Removed direct SQL query definition

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key
      // { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Do not pass user auth header with service key
    );

    // Get company_id from request body
    let company_id: string | null = null;
    try {
       const body = await req.json();
       company_id = body?.company_id;
    } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
    

    if (!company_id) {
        console.error("company_id missing from request body");
        return new Response(JSON.stringify({ error: 'company_id is required in body' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    console.log(`Calling get_dashboard_data RPC for company: ${company_id}`);

    // Call the database function via RPC
    const { data, error } = await supabaseClient.rpc('get_dashboard_data', {
      p_company_id: company_id, // Ensure parameter name matches the function definition
    });

    if (error) {
      console.error('Error calling get_dashboard_data RPC:', error);
      throw error;
    }

    console.log("Dashboard data fetched successfully via RPC:", data);

    // Return the aggregated data
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-dashboard-summary function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}) 