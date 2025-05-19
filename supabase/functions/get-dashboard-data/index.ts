
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("get-dashboard-data function initializing");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    console.log(`Fetching dashboard data for company: ${company_id}`);

    // Get emissions data
    const { data: emissionsData, error: emissionsError } = await supabaseClient
      .from('emission_entries')
      .select(`
        id,
        date,
        category,
        scope,
        quantity,
        unit,
        emission_calculations (
          total_emissions,
          co2_emissions,
          ch4_emissions,
          n2o_emissions,
          source
        )
      `)
      .eq('company_id', company_id)
      .order('date', { ascending: false });

    if (emissionsError) {
      throw emissionsError;
    }

    // Process data for dashboard
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastYear = currentYear - 1;

    // Calculate monthly trends
    const monthlyData: Record<string, any> = {};
    
    // Calculate scope breakdowns
    let scope1Total = 0;
    let scope2Total = 0;
    let scope3Total = 0;
    
    // Calculate category breakdowns
    const categoryTotals: Record<string, number> = {};

    // Process entries
    emissionsData?.forEach(entry => {
      const entryDate = new Date(entry.date);
      const year = entryDate.getFullYear();
      const month = entryDate.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      
      // Skip entries without calculations
      if (!entry.emission_calculations?.[0]?.total_emissions) return;
      
      const emissions = entry.emission_calculations[0].total_emissions;
      
      // Add to monthly data
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total_monthly_emissions: 0,
          scope_1_emissions: 0,
          scope_2_emissions: 0,
          scope_3_emissions: 0
        };
      }
      
      monthlyData[monthKey].total_monthly_emissions += emissions;
      
      // Add to scope totals
      if (entry.scope === 1) {
        scope1Total += emissions;
        monthlyData[monthKey].scope_1_emissions += emissions;
      } else if (entry.scope === 2) {
        scope2Total += emissions;
        monthlyData[monthKey].scope_2_emissions += emissions;
      } else if (entry.scope === 3) {
        scope3Total += emissions;
        monthlyData[monthKey].scope_3_emissions += emissions;
      }
      
      // Add to category totals
      if (!categoryTotals[entry.category]) {
        categoryTotals[entry.category] = 0;
      }
      categoryTotals[entry.category] += emissions;
    });
    
    // Convert to arrays
    const monthlyTrends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    
    const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value
    }));
    
    // Calculate KPIs
    // Current month data
    const currentMonthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
    const lastYearMonthKey = `${lastYear}-${currentMonth.toString().padStart(2, '0')}`;
    
    const currentMonthData = monthlyData[currentMonthKey] || { total_monthly_emissions: 0 };
    const lastYearMonthData = monthlyData[lastYearMonthKey] || { total_monthly_emissions: 0 };
    
    const monthlyEmissions = currentMonthData.total_monthly_emissions;
    const monthlyChangePercent = lastYearMonthData.total_monthly_emissions ? 
      ((monthlyEmissions - lastYearMonthData.total_monthly_emissions) / lastYearMonthData.total_monthly_emissions) * 100 : 0;
    
    // Calculate YTD
    const currentYearData = Object.values(monthlyData).filter((m: any) => 
      m.month.startsWith(currentYear.toString())
    ) as any[];
    
    const lastYearData = Object.values(monthlyData).filter((m: any) => 
      m.month.startsWith(lastYear.toString())
    ) as any[];
    
    const ytdEmissions = currentYearData.reduce((sum, m) => sum + m.total_monthly_emissions, 0);
    const lastYearYtdEmissions = lastYearData.reduce((sum, m) => sum + m.total_monthly_emissions, 0);
    
    const ytdChangePercent = lastYearYtdEmissions ? 
      ((ytdEmissions - lastYearYtdEmissions) / lastYearYtdEmissions) * 100 : 0;
    
    // Package all data for the dashboard
    const dashboardData = {
      total_emissions: scope1Total + scope2Total + scope3Total,
      emissions_by_scope: [
        { scope: "Scope 1", value: scope1Total },
        { scope: "Scope 2", value: scope2Total },
        { scope: "Scope 3", value: scope3Total }
      ],
      monthly_trends: monthlyTrends,
      category_breakdown: categoryBreakdown,
      kpis: {
        monthly: {
          value: monthlyEmissions,
          change_percent: monthlyChangePercent
        },
        ytd: {
          value: ytdEmissions,
          change_percent: ytdChangePercent
        }
      }
    };

    return new Response(JSON.stringify(dashboardData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in get-dashboard-data function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
