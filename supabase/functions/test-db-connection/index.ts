// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type"
};

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  console.log("Starting test-db-connection function");
  const supabase = getSupabaseClient();

  try {
    // Test query to list tables
    const { data: tables, error: tablesError } = await supabase.rpc(
      'pg_catalog_tables'
    );

    if (tablesError) {
      console.error("Error listing tables:", tablesError.message);
      
      // Try a direct query to list tables as fallback
      const { data: tables2, error: tables2Error } = await supabase.from('information_schema.tables')
        .select('table_schema, table_name')
        .eq('table_schema', 'public');
      
      if (tables2Error) {
        console.error("Error with fallback tables query:", tables2Error.message);
        throw tables2Error;
      }
      
      console.log("Tables (fallback):", tables2);
      return new Response(JSON.stringify({ tables: tables2 }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    console.log("Tables found:", tables);
    
    // Try to query emission_entries
    console.log("Attempting to query emission_entries table...");
    const { data: entries, error: entriesError } = await supabase
      .from("emission_entries")
      .select("*")
      .limit(5);
    
    if (entriesError) {
      console.error("Error querying emission_entries:", entriesError.message);
      return new Response(JSON.stringify({ 
        tables, 
        entriesError: entriesError.message 
      }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
    
    console.log("Emission entries found:", entries);
    
    return new Response(JSON.stringify({ 
      tables, 
      entries,
      message: "Database connection test successful!"
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
}); 