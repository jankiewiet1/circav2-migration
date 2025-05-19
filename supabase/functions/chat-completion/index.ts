
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for an emissions tracking platform. Your primary goal is to assist users with:

PLATFORM CAPABILITIES:
- Company emissions tracking and reporting
- Setting up and managing company details
- Understanding scope 1, 2, and 3 emissions
- Guidance on creating climate action plans
- Team member role management
- Data upload and emissions input
- Notification and settings configuration

COMMUNICATION GUIDELINES:
- Provide clear, concise, and actionable advice
- Break down complex topics into easily understandable steps
- If a query is too complex, suggest scheduling a consultation at info@epccommodities.com
- Maintain a professional and supportive tone
- Help users navigate the platform's features effectively

IMPORTANT NOTES:
- Prioritize data privacy and security
- Encourage sustainable business practices
- Offer contextual help based on the user's specific needs
- Guide users towards reducing their carbon footprint`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
