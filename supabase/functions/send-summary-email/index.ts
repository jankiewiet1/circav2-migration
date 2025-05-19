// Follow Deno deploy edge function format for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Send summary email function loaded");

const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { email, company, reduction, summary } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Sending detailed CO2 report to ${email}`);
    
    // In a real implementation, you'd use a service like SendGrid, AWS SES, or other email providers
    // For now, we'll just simulate a successful email send
    
    // Log the data we'll use to create the detailed report
    console.log('Company details:', company);
    console.log('Reduction targets:', reduction);
    console.log('Emission summary:', {
      totalCO2: summary.totalCO2,
      totalCost: summary.totalCost,
      categoryBreakdown: summary.categoryResults
    });
    
    // Generate PDF report here (in a real implementation)
    // This would involve using a PDF generation library
    // For example:
    // 1. Create a PDF template with company branding
    // 2. Add emission data and charts
    // 3. Include reduction targets and action plan
    // 4. Add company details and timestamp
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Detailed CO2 report has been sent to ${email}`,
        reportData: {
          company,
          emissions: {
            total: summary.totalCO2,
            cost: summary.totalCost,
            byCategory: summary.categoryResults
          },
          reductionPlan: {
            currentEmissions: summary.totalCO2,
            targetEmissions: reduction.targetEmissions,
            reductionPercentage: reduction.target,
            targetYear: reduction.year,
            requiredReduction: summary.totalCO2 - reduction.targetEmissions
          },
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
