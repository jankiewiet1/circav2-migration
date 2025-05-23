import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ManualEntryData {
  activity_description: string
  quantity: number
  unit: string
  emission_factor?: number
  ghg_category: 'scope1' | 'scope2' | 'scope3'
  activity_date: string
  notes?: string
  supplier_vendor?: string
  cost?: number
  currency?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Extract the data from the request body
    const requestBody = await req.json()
    console.log('Request body received:', requestBody)
    
    // Check if data is nested inside a 'data' property or at the top level
    const entryData: ManualEntryData = requestBody.data || requestBody

    console.log('Parsed entry data:', entryData)
    console.log('Currency value received:', entryData.currency)

    // Validate required fields
    if (!entryData.activity_description || !entryData.quantity || !entryData.unit || !entryData.ghg_category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map the ghg_category to the enum format for the data_entry table
    const ghgCategoryMap = {
      scope1: 'Scope 1',
      scope2: 'Scope 2', 
      scope3: 'Scope 3'
    }

    // Get user and company information
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'User authentication required', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user.id)

    // Get user's company from company_members table
    const { data: membership, error: membershipError } = await supabaseClient
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership?.company_id) {
      console.error('Membership error:', membershipError)
      return new Response(
        JSON.stringify({ error: 'User company membership not found', details: membershipError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User company ID:', membership.company_id, 'Role:', membership.role)

    // Insert into data_entry table 
    const { data: dataEntry, error: dataEntryError } = await supabaseClient
      .from('data_entry')
      .insert({
        company_id: membership.company_id,
        activity_description: entryData.activity_description,
        quantity: entryData.quantity,
        unit: entryData.unit,
        date: entryData.activity_date,
        ghg_category: ghgCategoryMap[entryData.ghg_category],
        supplier_vendor: entryData.supplier_vendor,
        cost: entryData.cost,
        currency: entryData.currency,
        notes: entryData.notes,
        source_type: 'manual entry',
        status: 'validated',
        created_at: new Date().toISOString(),
        created_by: user.id
      })
      .select()
      .single()

    if (dataEntryError) {
      console.error('Database error:', dataEntryError)
      return new Response(
        JSON.stringify({ error: 'Failed to save entry', details: dataEntryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Data entry saved:', dataEntry.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: dataEntry,
        message: 'Manual entry saved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
