import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

// API configuration
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Create OpenAI client with v2 header - ensure it's applied to all requests
function createOpenAIClient() {
  return new OpenAI({ 
    apiKey: OPENAI_API_KEY,
    defaultHeaders: {
      'OpenAI-Beta': 'assistants=v2'
    }
  });
}

// CORS headers
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info"
};

// Helper: Create Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

// Function to process emissions calculations for a batch of entries
async function processBatchCalculations(entries: any[]) {
  if (!OPENAI_API_KEY || entries.length === 0) {
    return { results: [], errors: ["No API key or entries to process"] };
  }

  try {
    const supabase = getSupabaseClient();
    const calculationResults: any[] = [];
    const errors: any[] = [];

    console.log(`🚀 Processing ${entries.length} entries in optimized batches...`);

    // Process entries in parallel batches of 10 for better performance
    const BATCH_SIZE = 10;
    const PARALLEL_BATCHES = 3; // Process 3 batches simultaneously
    
    for (let i = 0; i < entries.length; i += (BATCH_SIZE * PARALLEL_BATCHES)) {
      const megaBatch = entries.slice(i, i + (BATCH_SIZE * PARALLEL_BATCHES));
      
      // Split mega batch into smaller parallel batches
      const parallelBatches: any[][] = [];
      for (let j = 0; j < megaBatch.length; j += BATCH_SIZE) {
        parallelBatches.push(megaBatch.slice(j, j + BATCH_SIZE));
      }
      
      console.log(`📦 Processing ${parallelBatches.length} parallel batches (${megaBatch.length} entries total)`);
      
      // Process all parallel batches simultaneously
      const batchPromises = parallelBatches.map(async (batch: any[], batchIndex: number) => {
        console.log(`🔄 Starting batch ${batchIndex + 1} with ${batch.length} entries`);
        
        const batchResults: any[] = [];
        const batchErrors: any[] = [];
        
        // Create a fresh OpenAI client for each batch to ensure v2 header is applied
        const openai = createOpenAIClient();
        
        // Process entries in this batch sequentially (to avoid overwhelming OpenAI)
        for (const entry of batch) {
          try {
            // Use OpenAI Assistant API v2
            const assistantId = 'asst_za5gZj2In7O5ZbtNIAIjAniR'; // Your assistant ID
            
            console.log(`🤖 Creating thread for entry ${entry.id} with v2 API...`);
            
            // Create a thread for this calculation with explicit v2 header
            const thread = await openai.beta.threads.create({}, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });

            console.log(`📝 Sending message to thread ${thread.id}...`);

            // Send the calculation request to the assistant
            await openai.beta.threads.messages.create(thread.id, {
              role: "user",
              content: `Please calculate emissions for this activity using the most recent and standardized emission factors. Be consistent - use the same emission factor for identical categories.

Activity Details:
- Category: ${entry.category}
- Description: ${entry.description}
- Quantity: ${entry.quantity}
- Unit: ${entry.unit}
- Scope: ${entry.scope}

Requirements:
1. Use standardized emission factors (prefer DEFRA, EPA, or IEA 2024 data)
2. For electricity, use a consistent grid average factor (around 0.233 kg CO2e/kWh for global average)
3. Specify the exact source and year of the emission factor
4. Be consistent - same categories should use the same factors

Return the result in this exact JSON format:
{
  "emission_factor": 0.233,
  "emission_factor_unit": "kg CO2e/kWh",
  "total_emissions": 2330.0,
  "emissions_unit": "kg CO2e",
  "scope": 2,
  "source": "IEA Global Grid Average 2024",
  "confidence": 0.95,
  "calculation_details": "10000 kWh × 0.233 kg CO2e/kWh = 2330.0 kg CO2e",
  "warnings": [],
  "emission_breakdown": {"co2": 2330.0, "ch4": 0, "n2o": 0},
  "factor_metadata": {"factor_id": "IEA_2024_GRID", "year": 2024, "region": "Global", "category": "Electricity"}
}`
            }, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });

            console.log(`🏃 Starting assistant run...`);

            // Run the assistant with v2 API and explicit header
            const run = await openai.beta.threads.runs.create(thread.id, {
              assistant_id: assistantId,
            }, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });

            console.log(`⏳ Waiting for run ${run.id} to complete...`);

            // Wait for completion with proper v2 polling
            let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });
            let attempts = 0;
            const maxAttempts = 30; // 60 seconds timeout
            
            while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
              if (attempts >= maxAttempts) {
                throw new Error('Assistant run timed out');
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
              runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id, {
                headers: {
                  'OpenAI-Beta': 'assistants=v2'
                }
              });
              attempts++;
            }

            if (runStatus.status !== 'completed') {
              throw new Error(`Assistant run failed with status: ${runStatus.status}`);
            }

            console.log(`📨 Getting assistant response...`);

            // Get the assistant's response
            const messages = await openai.beta.threads.messages.list(thread.id, {}, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });
            const lastMessage = messages.data[0];
            
            if (lastMessage.role !== 'assistant' || !lastMessage.content || lastMessage.content.length === 0) {
              throw new Error('No valid response from assistant');
            }

            // Handle different content types in v2
            const messageContent = lastMessage.content[0];
            if (messageContent.type !== 'text') {
              throw new Error('Expected text response from assistant');
            }

            const responseContent = messageContent.text.value;
            
            // Parse the JSON response
            let assistantResponse;
            try {
              // Extract JSON from response (in case there's extra text)
              const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
              if (!jsonMatch) {
                throw new Error('No JSON found in assistant response');
              }
              assistantResponse = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
              console.error('Failed to parse assistant response:', responseContent);
              throw new Error(`Invalid JSON response: ${parseError.message}`);
            }

            console.log(`🧹 Cleaning up thread ${thread.id}...`);

            // Clean up the thread
            await openai.beta.threads.del(thread.id, {
              headers: {
                'OpenAI-Beta': 'assistants=v2'
              }
            });

            // Extract values from assistant response
            const emissions = assistantResponse.total_emissions || 0;
            const scope = assistantResponse.scope || entry.scope || 1;
            const emissionFactor = assistantResponse.emission_factor || 0;
            const confidence = assistantResponse.confidence || 0.95;
            const source = assistantResponse.source || 'OpenAI Assistant';

            // Save calculation to database
            const { error } = await supabase.from('emission_calc_openai').insert({
              company_id: entry.company_id,
              entry_id: entry.id,
              calculated_at: new Date().toISOString(),
              total_emissions: emissions,
              emissions_unit: assistantResponse.emissions_unit || 'kg CO2e',
              scope: scope.toString(),
              source: 'OPENAI_ASSISTANT_API',
              activity_id: 'assistant_calculated',
              emissions_factor_id: `asst_${Date.now()}_${entry.id.slice(-8)}`,
              factor_name: `AI Assistant - ${assistantResponse.source || 'Unknown'}`,
              region: assistantResponse.factor_metadata?.region || 'Global',
              category: `Scope ${scope}`,
              year_used: assistantResponse.factor_metadata?.year || new Date().getFullYear(),
              co2_emissions: assistantResponse.emission_breakdown?.co2 || emissions,
              ch4_emissions: assistantResponse.emission_breakdown?.ch4 || 0,
              n2o_emissions: assistantResponse.emission_breakdown?.n2o || 0,
              activity_data: {
                category: entry.category,
                quantity: entry.quantity,
                unit: entry.unit,
                description: entry.description,
                emission_factor: emissionFactor,
                emission_factor_unit: assistantResponse.emission_factor_unit || `kg CO2e/${entry.unit}`,
                confidence: confidence,
                calculation_method: 'assistant',
                calculation_details: assistantResponse.calculation_details || '',
                warnings: assistantResponse.warnings || [],
                assistant_response: assistantResponse
              },
              request_params: {
                assistant_id: assistantId,
                model: 'gpt-4-1106-preview',
                calculated_by: 'assistant_api',
                timestamp: new Date().toISOString()
              }
            });

            if (error) {
              throw error;
            }

            // Update the match_status in emission_entries
            await supabase
              .from('emission_entries')
              .update({ match_status: 'matched' })
              .eq('id', entry.id);

            batchResults.push({
              entry_id: entry.id,
              category: entry.category,
              emissions: emissions,
              emissions_unit: 'kg CO2e',
              scope: scope,
              source: 'OPENAI_ASSISTANT_API',
              success: true
            });
            
            console.log(`✅ Calculated: ${entry.id} = ${emissions} kg CO2e`);
            
          } catch (error) {
            console.error(`❌ Failed: ${entry.id} - ${error.message}`);
            batchErrors.push({
              entry_id: entry.id,
              error: error.message
            });
          }
        }
        
        console.log(`✅ Batch ${batchIndex + 1} completed: ${batchResults.length} success, ${batchErrors.length} errors`);
        return { results: batchResults, errors: batchErrors };
      });

      // Wait for all parallel batches to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Combine results from all parallel batches
      batchResults.forEach(({ results, errors: batchErrors }) => {
        calculationResults.push(...results);
        errors.push(...batchErrors);
      });
      
      console.log(`🎯 Mega-batch completed. Total so far: ${calculationResults.length} success, ${errors.length} errors`);
    }

    console.log(`🏁 All batches completed: ${calculationResults.length} success, ${errors.length} errors`);
    return { results: calculationResults, errors };
    
  } catch (error) {
    console.error("💥 Error processing batch:", error);
    return { results: [], errors: [error.message] };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { company_id, entry_ids } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "Company ID is required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    const supabase = getSupabaseClient();

    // Get entries to process
    let query = supabase
      .from('emission_entries')
      .select('*')
      .eq('company_id', company_id);

    if (entry_ids && entry_ids.length > 0) {
      query = query.in('id', entry_ids);
    } else {
      query = query.eq('match_status', 'unmatched');
    }

    const { data: entries, error } = await query;

    if (error) {
      throw error;
    }

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No entries to process",
        processed: 0
      }), {
        headers: { ...CORS, "Content-Type": "application/json" }
      });
    }

    // Process the entries
    const { results, errors } = await processBatchCalculations(entries);

    return new Response(JSON.stringify({ 
      processed: entries.length,
      calculated: results.length,
      results,
      errors
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
}); 