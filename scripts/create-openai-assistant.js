#!/usr/bin/env node

/**
 * Script to create a real OpenAI Assistant for Carbon Accounting
 * Run with: npm run create-assistant
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Check for API key
const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OpenAI API key not found!');
  console.error('Please set OPENAI_API_KEY or VITE_OPENAI_API_KEY environment variable');
  console.error('Get your API key from: https://platform.openai.com/api-keys');
  console.error('\nExample:');
  console.error('export OPENAI_API_KEY=sk-your-key-here');
  console.error('npm run create-assistant');
  process.exit(1);
}

console.log('🔑 OpenAI API key found:', apiKey.substring(0, 10) + '...');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

// Assistant configuration
const assistantConfig = {
  name: "Carbon Accounting Expert",
  description: "Expert assistant for calculating greenhouse gas emissions and carbon footprints using industry-standard methodologies and emission factors.",
  instructions: `You are a specialized carbon accounting expert with deep knowledge of:

1. **GHG Protocol Standards** (Scope 1, 2, 3 emissions)
2. **Emission Factors** from IPCC, DEFRA, EPA, and other authoritative sources
3. **Unit Conversions** for energy, fuel, distance, and other measurements
4. **Industry-Specific Calculations** for various sectors

## Your Core Functions:

### Emission Calculations
- Calculate CO2e emissions for activities like fuel consumption, electricity use, travel, etc.
- Apply appropriate emission factors based on geography, fuel type, and methodology
- Classify emissions into correct GHG Protocol scopes (1, 2, or 3)

### Data Validation
- Validate input data for completeness and accuracy
- Flag unusual values or potential data quality issues
- Suggest corrections for common data entry errors

### Methodology Guidance
- Recommend best practices for data collection and calculation
- Explain calculation methodologies and assumptions
- Provide confidence assessments for calculations

## Response Format:
Always respond with structured JSON containing:
- emission_factor: The emission factor used (number)
- emission_factor_unit: Unit of the emission factor (string)
- total_emissions: Total calculated emissions (number)
- emissions_unit: Unit of total emissions (typically "kg CO2e")
- scope: GHG Protocol scope (1, 2, or 3)
- source: Data source/methodology used (string)
- confidence: Confidence level 0-1 (number)
- calculation_details: Step-by-step calculation explanation (string)
- warnings: Array of any warnings or notes (array)

## Key Emission Factors (examples):
- Diesel: 2.68 kg CO2e/liter (Scope 1)
- Petrol: 2.31 kg CO2e/liter (Scope 1)
- Natural Gas: 2.03 kg CO2e/m³ (Scope 1)
- Grid Electricity (Global avg): 0.45 kg CO2e/kWh (Scope 2)
- Air Travel (short-haul): 0.25 kg CO2e/km (Scope 3)

Always prioritize accuracy, transparency, and compliance with international standards.`,
  model: "gpt-4o",
  tools: [
    {
      type: "function",
      function: {
        name: "validate_emission_factor",
        description: "Validate and lookup emission factors from authoritative sources",
        parameters: {
          type: "object",
          properties: {
            activity_type: {
              type: "string",
              description: "Type of activity (e.g., 'fuel_combustion', 'electricity', 'travel')"
            },
            fuel_type: {
              type: "string",
              description: "Specific fuel or energy type (e.g., 'diesel', 'natural_gas', 'grid_electricity')"
            },
            region: {
              type: "string",
              description: "Geographic region for location-specific factors"
            }
          },
          required: ["activity_type"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "classify_ghg_scope",
        description: "Classify emissions into GHG Protocol scopes (1, 2, or 3)",
        parameters: {
          type: "object",
          properties: {
            activity_description: {
              type: "string",
              description: "Description of the emission-generating activity"
            },
            company_control: {
              type: "boolean",
              description: "Whether the company has operational control over the emission source"
            }
          },
          required: ["activity_description"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "convert_units",
        description: "Convert between different units of measurement",
        parameters: {
          type: "object",
          properties: {
            value: {
              type: "number",
              description: "Value to convert"
            },
            from_unit: {
              type: "string",
              description: "Source unit"
            },
            to_unit: {
              type: "string",
              description: "Target unit"
            }
          },
          required: ["value", "from_unit", "to_unit"]
        }
      }
    }
  ],
  temperature: 0.1,
  response_format: { type: "json_object" }
};

async function createAssistant() {
  try {
    console.log('🚀 Creating OpenAI Assistant for Carbon Accounting...');
    
    // Create the assistant
    const assistant = await openai.beta.assistants.create(assistantConfig);
    
    console.log('✅ Assistant created successfully!');
    console.log('📋 Assistant Details:');
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Model: ${assistant.model}`);
    console.log(`   Tools: ${assistant.tools.length} functions`);
    
    // Save assistant ID to a config file
    const configPath = path.join(process.cwd(), 'assistant-config.json');
    const config = {
      assistant_id: assistant.id,
      created_at: new Date().toISOString(),
      name: assistant.name,
      model: assistant.model,
      tools_count: assistant.tools.length
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Assistant configuration saved to: ${configPath}`);
    
    // Update environment variable suggestion
    console.log('\n🔧 Next Steps:');
    console.log('1. Add this to your .env.local file:');
    console.log(`   VITE_OPENAI_ASSISTANT_ID=${assistant.id}`);
    console.log(`   VITE_OPENAI_API_KEY=${apiKey.substring(0, 10)}...`);
    console.log('2. Restart your development server');
    console.log('3. Uncheck "Demo mode" in the Data Upload page');
    console.log('4. Test the real assistant!');
    
    return assistant;
    
  } catch (error) {
    console.error('❌ Failed to create assistant:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Authentication failed. Please check your OpenAI API key.');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit exceeded. Please try again in a moment.');
    } else if (error.status === 400) {
      console.error('📝 Invalid request. Please check the assistant configuration.');
    }
    
    process.exit(1);
  }
}

// Run the script
createAssistant().catch(console.error); 