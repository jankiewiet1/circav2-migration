import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call OpenAI API for general questions
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are Circa's Carbon Data Agent assistant, an expert in carbon accounting, sustainability, and environmental reporting. You help users understand:

- Carbon footprint measurement and calculation
- GHG Protocol standards (Scope 1, 2, 3 emissions)
- Sustainability reporting frameworks (CDP, TCFD, CSRD, etc.)
- Emission factors and data sources
- Carbon reduction strategies
- Environmental compliance and regulations
- Circa's platform features and capabilities

Provide helpful, accurate, and actionable advice. Keep responses concise but informative. If asked about specific emission calculations, suggest using the calculation feature. For technical platform questions, direct users to support at info@circa.site.

Always maintain a professional, helpful tone and focus on practical guidance for carbon accounting and sustainability.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text())
      throw new Error('Failed to get response from OpenAI')
    }

    const openaiData = await openaiResponse.json()
    const assistantResponse = openaiData.choices[0]?.message?.content

    if (!assistantResponse) {
      throw new Error('No response from OpenAI')
    }

    return new Response(
      JSON.stringify({ 
        response: assistantResponse,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Chat assistant error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 