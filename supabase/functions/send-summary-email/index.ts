// Follow Deno deploy edge function format for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

console.log("Send summary email function loaded");

// Define CORS headers inline (no external dependency)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Inline recommended actions data - all in English
const reductionTips = [
  {
    category: "Electricity",
    tips: [
      {
        title: "Switch to 100% Renewable Energy",
        description: "Change to a provider offering certified green electricity from Dutch wind or solar sources.",
        impact: "high",
        difficulty: "low",
        savingPotential: "100%"
      },
      {
        title: "Install LED Lighting",
        description: "Replace all conventional lighting with LED alternatives throughout your office.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "75-90%"
      },
      {
        title: "Smart Building Controls",
        description: "Install motion sensors and smart thermostats to reduce energy waste.",
        impact: "medium",
        difficulty: "medium",
        savingPotential: "20-30%"
      },
      {
        title: "Solar Panel Installation",
        description: "Install solar panels on your office roof to generate your own renewable electricity.",
        impact: "high",
        difficulty: "high",
        savingPotential: "30-100%"
      }
    ]
  },
  {
    category: "Heating",
    tips: [
      {
        title: "Building Insulation",
        description: "Improve wall, roof, and window insulation to reduce heat loss.",
        impact: "high",
        difficulty: "high",
        savingPotential: "25-60%"
      },
      {
        title: "Heat Pump Installation",
        description: "Replace fossil fuel heating systems with electric heat pumps.",
        impact: "high",
        difficulty: "high",
        savingPotential: "50-80%"
      },
      {
        title: "Switch to Biogas",
        description: "If heat pumps aren't viable, consider switching to certified biogas.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "60-75%"
      },
      {
        title: "Lower Thermostat Setting",
        description: "Reduce office temperature by 1-2°C during working hours.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "8-12%"
      }
    ]
  },
  {
    category: "Business Transport",
    tips: [
      {
        title: "Electric Vehicle Fleet",
        description: "Replace company cars with electric vehicles charged with renewable energy.",
        impact: "high",
        difficulty: "medium",
        savingPotential: "90-100%"
      },
      {
        title: "Remote Work Policy",
        description: "Implement a structured remote work policy to reduce commuting.",
        impact: "high",
        difficulty: "low",
        savingPotential: "20-40%"
      },
      {
        title: "Company Biking Program",
        description: "Provide company bikes or e-bikes for local trips and commuting.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "100% per trip"
      },
      {
        title: "Green Commuting Incentives",
        description: "Offer financial incentives for employees using public transport.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "50-70% per commuter"
      }
    ]
  },
  {
    category: "Flights",
    tips: [
      {
        title: "Virtual Meeting Policy",
        description: "Implement a policy requiring virtual alternatives before approving flights.",
        impact: "high",
        difficulty: "low",
        savingPotential: "Variable"
      },
      {
        title: "Train Travel for Short Distances",
        description: "Mandate train travel for trips under 700km when possible.",
        impact: "high",
        difficulty: "medium",
        savingPotential: "70-90% per trip"
      },
      {
        title: "Combine Trips",
        description: "Plan multiple meetings in the same region for a single trip.",
        impact: "medium",
        difficulty: "medium",
        savingPotential: "50%+"
      },
      {
        title: "High Quality Carbon Offsetting",
        description: "Invest in Gold Standard carbon offsets for unavoidable flights.",
        impact: "medium",
        difficulty: "low",
        savingPotential: "100% (offset)"
      }
    ]
  }
];

// Category mapping from Dutch to English
const categoryMapping = {
  "Elektriciteit": "Electricity",
  "Verwarming": "Heating",
  "Zakelijk vervoer": "Business Transport",
  "Vliegreizen": "Flights"
};

const handler = async (req: Request) => {
  try {
    console.log("Received request");
    
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
      console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }
  
    // Clone the request to read it multiple times if needed
    const clonedReq = req.clone();
    
    // Log raw request first for debugging
    try {
      const rawBody = await clonedReq.text();
      console.log("Raw request body:", rawBody);
      
      // Parse the JSON
      let payload;
      try {
        payload = JSON.parse(rawBody);
        console.log("Parsed payload:", JSON.stringify(payload));
      } catch (parseError) {
        console.error("Failed to parse request body as JSON:", parseError);
        throw new Error("Invalid JSON in request body");
      }
      
      // Normalize the payload to handle different formats
      // Sometimes frontend sends {email, company, reduction, summary}
      // Sometimes it might send {to, data: {company, totalCO2, totalCost, etc.}}
      
      const to = payload.email || payload.to;
      if (!to) {
        console.error("Missing required email/to field");
        throw new Error("Email is required");
      }
      
      console.log(`Sending CO2 summary email to ${to}`);
      
      // Handle different payload formats
      const data = payload.data || payload;
      const summary = data.summary || {
        totalCO2: data.totalCO2,
        totalCost: data.totalCost,
        categoryResults: data.categoryResults
      };
      
      // Default values for safety
      if (!summary.totalCO2 && typeof data.totalCO2 === 'number') {
        summary.totalCO2 = data.totalCO2;
      }
      
      if (!summary.totalCost && typeof data.totalCost === 'number') {
        summary.totalCost = data.totalCost;
      }
      
      if (!summary.categoryResults && Array.isArray(data.categoryResults)) {
        summary.categoryResults = data.categoryResults;
      }
      
      // Ensure we have the minimum required data
      if (!summary.totalCO2 || !summary.totalCost || !Array.isArray(summary.categoryResults)) {
        console.error("Missing required summary data", summary);
        throw new Error("Missing required summary data (totalCO2, totalCost, or categoryResults)");
      }
      
      const company = data.company || {};
      const reduction = data.reduction || {};
      
      // Log the normalized data
      console.log("Normalized data for email:", {
        to,
        company,
        reduction,
        summary
      });
      
      // Build HTML email
      function generateSummaryHtml({ company, summary, reduction }) {
        const logoUrl = "https://circa.site/circa-logo.png";
        const brandColor = "#10b981";
        const calendlyUrl = "https://calendly.com/circa-info/30min";
        
        // Helper to render recommended actions by category
        function renderActions() {
          if (!Array.isArray(summary.categoryResults)) {
            console.warn("categoryResults is not an array, can't render actions");
            return '';
          }
          
          return summary.categoryResults.map(cat => {
            if (!cat || typeof cat !== 'object') {
              console.warn("Invalid category item:", cat);
              return '';
            }
            
            // Map Dutch category name to English
            const englishCategory = categoryMapping[cat.category] || cat.category || "Other";
            
            // Find tips for this category (use English category name in our tips array)
            const tips = reductionTips.find(c => c.category === englishCategory)?.tips || [];
            
            if (!tips.length) {
              console.warn(`No tips found for category: ${englishCategory}`);
              return '';
            }
            
            return `
              <tr><td colspan="2" style="padding-top:24px;padding-bottom:8px;"><h3 style="color:${brandColor};margin:0 0 8px 0;font-size:18px;">${englishCategory} <span style='font-size:14px;color:#64748b;'>(${Number(cat.total).toFixed(1)} kg CO₂)</span></h3></td></tr>
              ${tips.map(tip => `
                <tr>
                  <td style="vertical-align:top;padding:8px 0 8px 16px;">
                    <div style="font-weight:600;font-size:15px;">${tip.title}</div>
                    <div style="color:#64748b;font-size:13px;">${tip.description}</div>
                    <div style="margin-top:4px;">
                      <span style="background:#e0f7ef;color:#059669;border-radius:4px;padding:2px 8px;font-size:12px;margin-right:4px;">Impact: ${tip.impact}</span>
                      <span style="background:#fef9c3;color:#b45309;border-radius:4px;padding:2px 8px;font-size:12px;margin-right:4px;">Effort: ${tip.difficulty}</span>
                      <span style="background:#dbeafe;color:#2563eb;border-radius:4px;padding:2px 8px;font-size:12px;">Savings: ${tip.savingPotential}</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            `;
          }).join('');
        }
        
        // Safe access helpers
        const safeNumber = (value) => {
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };
        
        const totalCO2 = safeNumber(summary.totalCO2);
        const totalCost = safeNumber(summary.totalCost);
        const companyName = company?.name || (typeof company === 'string' ? company : '-');
        const targetEmissions = safeNumber(reduction?.targetEmissions);
        
        return `
        <div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:0;margin:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0001;overflow:hidden;">
            <tr>
              <td style="background:${brandColor};padding:24px 0;text-align:center;">
                <img src="${logoUrl}" alt="Circa Logo" style="height:80px;margin-bottom:8px;" />
                <h1 style="color:#fff;font-size:28px;margin:0;">Your CO₂ Emission Summary</h1>
              </td>
            </tr>
            <tr><td style="padding:32px 24px;">
              <h2 style="color:${brandColor};font-size:22px;margin:0 0 16px 0;">Summary</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td colspan="2"><strong>Emissions Overview</strong></td></tr>
                <tr><td>Total emissions:</td><td><strong>${totalCO2.toFixed(2)} kg CO₂e</strong></td></tr>
                <tr><td>Total social cost:</td><td>€ ${totalCost.toFixed(2)}</td></tr>
                <tr><td>Emissions per FTE:</td><td>${totalCO2.toFixed(2)} kg CO₂e</td></tr>
                <tr><td colspan="2" style="padding-top:16px;"><strong>Company Info</strong></td></tr>
                <tr><td>Company Name:</td><td>${companyName}</td></tr>
                <tr><td>Company Address:</td><td>${company?.address || '-'}</td></tr>
                <tr><td>Number of Employees (FTE):</td><td>${company?.fte || '-'}</td></tr>
                <tr><td colspan="2" style="padding-top:16px;"><strong>CO₂ Reduction Target</strong></td></tr>
                <tr><td>Target Reduction Percentage:</td><td>${reduction?.target || '-'}% by ${reduction?.year || '-'}</td></tr>
                <tr><td>Current emissions:</td><td>${totalCO2.toFixed(2)} kg CO₂e</td></tr>
                <tr><td>Target emissions:</td><td>${targetEmissions.toFixed(2)} kg CO₂e</td></tr>
                <tr><td>Required reduction:</td><td>${reduction && summary.totalCO2 && reduction.targetEmissions ? (totalCO2 - targetEmissions).toFixed(2) : '-'} kg CO₂e</td></tr>
              </table>
              <h2 style="color:${brandColor};font-size:20px;margin:32px 0 12px 0;">Recommended Actions to Reduce Emissions</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${renderActions()}
              </table>
              <div style="text-align:center;margin:32px 0 0 0;">
                <a href="${calendlyUrl}" style="display:inline-block;background:${brandColor};color:#fff;font-weight:600;font-size:18px;padding:16px 32px;border-radius:6px;text-decoration:none;">Book Your Onboarding Call</a>
                <div style="margin-top:8px;font-size:13px;color:#64748b;">Let us show you how Circa can help your organization track and reduce its carbon footprint.</div>
              </div>
            </td></tr>
          </table>
          <div style="text-align:center;color:#64748b;font-size:12px;margin:24px 0;">&copy; ${new Date().getFullYear()} Circa. All rights reserved.</div>
        </div>
        `;
      }
      
      // Add plain text version generator
      function generateSummaryPlainText({ company, summary, reduction }) {
        const companyName = company?.name || (typeof company === 'string' ? company : '-');
        const totalCO2 = Number(summary.totalCO2).toFixed(2);
        const totalCost = Number(summary.totalCost).toFixed(2);
        const targetEmissions = reduction?.targetEmissions ? Number(reduction.targetEmissions).toFixed(2) : '-';
        return `Your CO2 Emission Summary\n\nSummary\nEmissions Overview\nTotal emissions: ${totalCO2} kg CO2e\nTotal social cost: €${totalCost}\nEmissions per FTE: ${totalCO2} kg CO2e\n\nCompany Info\nCompany Name: ${companyName}\nCompany Address: ${company?.address || '-'}\nNumber of Employees (FTE): ${company?.fte || '-'}\n\nCO2 Reduction Target\nTarget Reduction Percentage: ${reduction?.target || '-'}% by ${reduction?.year || '-'}\nCurrent emissions: ${totalCO2} kg CO2e\nTarget emissions: ${targetEmissions} kg CO2e\nRequired reduction: ${(summary.totalCO2 && reduction.targetEmissions) ? (Number(summary.totalCO2) - Number(reduction.targetEmissions)).toFixed(2) : '-'} kg CO2e\n\nBook your onboarding call: https://calendly.com/circa-info/30min\nLet us show you how Circa can help your organization track and reduce its carbon footprint.\n\n© ${new Date().getFullYear()} Circa. All rights reserved.`;
      }
      
      try {
        // Send the email using Resend API
        console.log("Generating HTML email...");
        const html = generateSummaryHtml({
          company,
          summary,
          reduction
        });
        const text = generateSummaryPlainText({
          company,
          summary,
          reduction
        });
        console.log("HTML generated successfully");
        
        console.log("Sending email via Resend API...");
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
          },
          body: JSON.stringify({
            from: 'Circa <noreply@circa.site>',
            to: [to],
            subject: 'Your CO₂ Emission Summary from Circa',
            html,
            text
          })
        });
        
        console.log("Resend API response status:", response.status);
        
        let responseData;
        try {
          responseData = await response.json();
          console.log("Resend API response data:", responseData);
        } catch (jsonError) {
          console.error("Failed to parse Resend API response as JSON:", jsonError);
          const text = await response.text();
          console.log("Raw response text:", text);
          responseData = { error: "Failed to parse response" };
        }
        
        if (!response.ok) {
          console.error('Resend API error status:', response.status);
          console.error('Resend API error response:', responseData);
          throw new Error(`Failed to send email via Resend: ${responseData.error || response.statusText}`);
        }
        
        console.log(`Sending CO2 summary email to ${to} - SUCCESS`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Detailed CO2 report has been sent to ${to}`,
            emailId: responseData?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
      } catch (emailError) {
        console.error("Error in email sending process:", emailError);
        throw emailError;
      }
    } catch (bodyError) {
      console.error("Error processing request body:", bodyError);
      throw bodyError;
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
