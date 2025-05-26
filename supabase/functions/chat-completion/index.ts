import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  session_id?: string;
  user_id?: string;
}

function getEnhancedSystemPrompt(): string {
  return `You are a smart, friendly, and expert assistant embedded in a Carbon Data Agent sustainability platform. Your goals are:

1. **Platform Navigation & Support**: Help users understand and navigate the platform including:
   - Data upload methods (Manual Entry, CSV Upload, AI Upload, ERP/API Integration)
   - Emission calculation and tracking features
   - Company setup and team management
   - Dashboard and reporting capabilities
   - Settings and configuration options

2. **Sustainability Consulting**: Act as a sustainability consultant to help users:
   - Reduce carbon emissions and understand ESG metrics
   - Implement sustainable business practices
   - Understand Scope 1, 2, and 3 emissions
   - Create effective climate action plans
   - Meet regulatory compliance requirements

3. **Technical Support**: Provide customer support for:
   - Data upload and processing issues
   - Integration problems with ERP/API systems
   - Calculation errors and data validation
   - Account and user management
   - Troubleshooting platform features

4. **Feature Suggestions**: When users suggest new features or improvements:
   - Acknowledge their suggestion positively
   - Ask clarifying questions if needed
   - Confirm you've logged their suggestion for review
   - Thank them for helping improve the platform

5. **Communication Style**:
   - Be conversational but concise and professional
   - Provide actionable insights and step-by-step guidance
   - Ask follow-up questions when necessary to clarify user needs
   - If you don't know something, admit it and offer to escalate
   - Always be supportive and encouraging about sustainability efforts

**IMPORTANT PLATFORM CONTEXT**:
- The platform supports multiple data upload methods including AI-powered PDF/document processing
- Users can connect ERP systems (SAP, Odoo, Dynamics), CRM (HubSpot), and accounting systems (QuickBooks, Xero)
- Emission calculations use the Climatiq API for accurate carbon factors
- The platform tracks Scope 1 (direct), Scope 2 (electricity), and Scope 3 (indirect) emissions
- Users can manage teams, set targets, and generate compliance reports

**FEATURE SUGGESTION DETECTION**:
If a user suggests a new feature, improvement, or expresses a wish for functionality, respond with acknowledgment and mention that you've logged their suggestion. Look for phrases like:
- "I wish the platform had..."
- "It would be great if..."
- "Can you add..."
- "I need a feature that..."
- "The platform should..."

**ESCALATION**:
For complex technical issues, account problems, or detailed consulting needs, direct users to contact support at info@circa.site.

Always provide helpful, accurate information while maintaining a positive and professional tone.`;
}

function detectFeatureSuggestion(message: string): boolean {
  const suggestionPatterns = [
    /i wish.*(?:platform|system|feature|dashboard|report)/i,
    /it would be (?:great|nice|helpful|useful) if/i,
    /can you add/i,
    /could you add/i,
    /i need.*(?:feature|function|capability)/i,
    /the platform should/i,
    /you should add/i,
    /would love to see/i,
    /missing.*feature/i,
    /suggestion.*(?:feature|improvement)/i
  ];

  return suggestionPatterns.some(pattern => pattern.test(message));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ChatRequest = await req.json();
    const { messages } = requestData;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Check if the last user message contains a feature suggestion
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const suggestionDetected = lastUserMessage ? detectFeatureSuggestion(lastUserMessage.content) : false;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: getEnhancedSystemPrompt()
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add suggestion detection to response
    const enhancedData = {
      ...data,
      suggestion_logged: suggestionDetected
    };

    return new Response(JSON.stringify(enhancedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Enhanced chat completion error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      choices: [{
        message: {
          content: "I'm experiencing technical difficulties. Please contact our support team at info@circa.site for immediate assistance.",
          role: 'assistant'
        }
      }]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
