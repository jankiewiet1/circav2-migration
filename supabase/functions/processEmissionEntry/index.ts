import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EmissionEntryRequest {
  id: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body and handle potential errors
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid JSON in request body',
          error: parseError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { id } = requestBody as EmissionEntryRequest;

    console.log('Received request with ID:', id);

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Entry ID is required'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error: Missing credentials'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Get the emission entry
    console.log('Fetching entry with ID:', id);
    const { data: entry, error: entryError } = await supabaseClient
      .from('emission_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (entryError) {
      console.error('Error fetching entry:', entryError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error fetching entry: ${entryError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!entry) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Entry not found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Entry found:', entry);

    // Get the emission factors for the category
    console.log('Looking for emission factors for category:', entry.category);
    const { data: factors, error: factorsError } = await supabaseClient
      .from('emission_factors')
      .select('*')
      .eq('category_1', entry.category)
      .order('id', { ascending: false })
      .limit(1);

    if (factorsError) {
      console.error('Error fetching emission factors:', factorsError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error fetching emission factors: ${factorsError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let result = null;
    let matchStatus = 'pending';

    if (factors && factors.length > 0) {
      const factor = factors[0];
      console.log('Found matching factor:', factor);
      
      // Handle potential missing fields gracefully
      const conversionFactor = factor['GHG Conversion Factor'] || 1;
      const totalEmissions = entry.quantity * conversionFactor;

      console.log('Calculated emissions:', totalEmissions);
      
      try {
        // Insert calculation record
        console.log('Inserting calculation record');
        const { data: calcData, error: calcError } = await supabaseClient
          .from('emission_calc_climatiq')
          .insert({
            company_id: entry.company_id,
            entry_id: entry.id,
            total_emissions: totalEmissions,
            emissions_unit: 'kg CO2e',
            climatiq_activity_id: factor.category_1,
            climatiq_factor_name: `${factor.category_1} - ${factor.category_2 || ''} - ${factor.category_3 || ''}`,
            climatiq_source: factor.Source || 'DEFRA',
            climatiq_year: new Date().getFullYear(),
            calculated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (calcError) {
          console.error('Error creating calculation record:', calcError);
          throw calcError;
        }

        result = calcData;
        matchStatus = 'matched';
        console.log('Calculation record created successfully');
      } catch (insertError) {
        console.error('Error inserting calculation:', insertError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Error inserting calculation: ${insertError.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      console.log('No matching factors found');
      matchStatus = 'factor_not_found';
    }

    // Update the entry status
    console.log('Updating entry status to:', matchStatus);
    const { error: updateError } = await supabaseClient
      .from('emission_entries')
      .update({ match_status: matchStatus })
      .eq('id', entry.id);

    if (updateError) {
      console.error('Error updating entry status:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error updating entry status: ${updateError.message}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Entry processed successfully');
    return new Response(
      JSON.stringify({
        success: true,
        message: `Entry processed with status: ${matchStatus}`,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error processing entry:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'An unknown error occurred',
        stack: error.stack || 'No stack trace available'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}) 