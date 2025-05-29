#!/usr/bin/env node

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your existing assistant ID
const ASSISTANT_ID = 'asst_lgIBVnkFbxotum0R29rIhTj';

async function updateAssistant() {
  try {
    console.log('🔄 Updating OpenAI Assistant for Carbon Accounting...');
    
    // Read the configuration file
    const configPath = path.join(__dirname, '..', 'carbon-accounting-assistant-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log(`📋 Loaded configuration: ${config.name}`);
    
    // First, check if the assistant exists
    try {
      const existingAssistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log(`✅ Found existing assistant: ${existingAssistant.name}`);
    } catch (error) {
      console.error(`❌ Assistant ${ASSISTANT_ID} not found. Please check the ID.`);
      process.exit(1);
    }
    
    // Update the assistant with new configuration
    const updatedAssistant = await openai.beta.assistants.update(ASSISTANT_ID, {
      name: config.name,
      description: config.description,
      instructions: config.instructions,
      model: config.model,
      tools: config.tools,
      temperature: config.temperature,
      top_p: config.top_p,
      response_format: config.response_format,
      metadata: config.metadata
    });
    
    console.log('✅ Assistant updated successfully!');
    console.log(`📝 Name: ${updatedAssistant.name}`);
    console.log(`🤖 Model: ${updatedAssistant.model}`);
    console.log(`🛠️  Tools: ${updatedAssistant.tools.length} tools configured`);
    console.log(`🌡️  Temperature: ${updatedAssistant.temperature}`);
    
    // List the tools
    console.log('\n🔧 Configured Tools:');
    updatedAssistant.tools.forEach((tool, index) => {
      if (tool.type === 'function') {
        console.log(`  ${index + 1}. Function: ${tool.function.name}`);
        console.log(`     Description: ${tool.function.description}`);
      } else {
        console.log(`  ${index + 1}. ${tool.type}`);
      }
    });
    
    // Check vector store configuration
    if (config.tool_resources?.file_search?.vector_stores) {
      console.log('\n📚 Vector Store Configuration:');
      config.tool_resources.file_search.vector_stores.forEach((vs, index) => {
        console.log(`  ${index + 1}. ${vs.name}: ${vs.description}`);
      });
      console.log('⚠️  Note: Vector store files need to be uploaded manually via the OpenAI platform');
    }
    
    console.log('\n🎯 Assistant is now optimized for:');
    console.log('  • Emission factor lookup from knowledge base');
    console.log('  • Precise CO2e emission calculations');
    console.log('  • GHG Protocol scope classification');
    console.log('  • Unit conversions and validations');
    console.log('  • Confidence scoring and quality assurance');
    
    console.log('\n✨ Your assistant is ready to calculate emissions!');
    console.log(`🔗 Assistant ID: ${ASSISTANT_ID}`);
    
  } catch (error) {
    console.error('❌ Error updating assistant:', error.message);
    
    if (error.code === 'invalid_api_key') {
      console.log('\n💡 Please set your OpenAI API key:');
      console.log('   export OPENAI_API_KEY="your-api-key-here"');
    }
    
    process.exit(1);
  }
}

// Test the assistant with a sample calculation
async function testAssistant() {
  try {
    console.log('\n🧪 Testing assistant with sample calculation...');
    
    // Create a test thread
    const thread = await openai.beta.threads.create();
    
    // Send a test message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Calculate the total CO2e emissions for this activity:

Activity: Diesel fuel for company vehicles
Category: fuel
Quantity: 100
Unit: liters
Date: 2024-05-27
Expected Scope: 1

Please provide:
1. The appropriate emission factor and its source
2. The total CO2e emissions calculation
3. Scope classification (1, 2, or 3)
4. Confidence level (0-1)
5. Any warnings or notes

Return the result in JSON format as specified in your instructions.`
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    if (runStatus.status === 'completed') {
      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0].content[0];
      
      if (response.type === 'text') {
        console.log('✅ Test calculation successful!');
        console.log('📊 Response:', response.text.value);
      }
    } else {
      console.log(`⚠️  Test run status: ${runStatus.status}`);
      if (runStatus.last_error) {
        console.log('Error:', runStatus.last_error.message);
      }
    }
    
    // Clean up
    await openai.beta.threads.del(thread.id);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution
async function main() {
  await updateAssistant();
  
  // Ask if user wants to run a test
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\n🤔 Would you like to run a test calculation? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await testAssistant();
    }
    rl.close();
  });
}

main().catch(console.error); 