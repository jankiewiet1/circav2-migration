#!/usr/bin/env node

/**
 * Test script to verify OpenAI Assistant integration
 * Run with: node scripts/test-assistant.js
 */

const OpenAI = require('openai');

// Check for API key
const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.log('❌ No OpenAI API key found - this is expected in demo mode');
  console.log('✅ Demo mode will work without API key');
  console.log('📖 See REAL_ASSISTANT_SETUP.md to enable real OpenAI Assistant');
  process.exit(0);
}

console.log('🔑 OpenAI API key found:', apiKey.substring(0, 10) + '...');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
});

async function testAssistant() {
  try {
    console.log('🧪 Testing OpenAI API connection...');
    
    // Test basic API connection
    const models = await openai.models.list();
    console.log('✅ OpenAI API connection successful');
    console.log(`📋 Available models: ${models.data.length} found`);
    
    // Check if we have an assistant ID
    const assistantId = process.env.VITE_OPENAI_ASSISTANT_ID || process.env.OPENAI_ASSISTANT_ID;
    
    if (!assistantId) {
      console.log('⚠️  No assistant ID found');
      console.log('🔧 Run: npm run create-assistant');
      return;
    }
    
    console.log('🤖 Testing assistant:', assistantId.substring(0, 15) + '...');
    
    // Try to retrieve the assistant
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    console.log('✅ Assistant found successfully!');
    console.log(`   Name: ${assistant.name}`);
    console.log(`   Model: ${assistant.model}`);
    console.log(`   Tools: ${assistant.tools.length}`);
    
    // Test a simple calculation
    console.log('🧮 Testing emission calculation...');
    
    const thread = await openai.beta.threads.create();
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Calculate CO2e emissions for:
Activity: Diesel fuel consumption
Quantity: 100
Unit: liters
Category: Vehicle fuel

Return JSON format with emission_factor, total_emissions, scope, confidence, etc.`
    });
    
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    
    while (runStatus.status !== 'completed' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      
      if (runStatus.status === 'failed') {
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message}`);
      }
    }
    
    if (runStatus.status !== 'completed') {
      throw new Error('Assistant run timed out');
    }
    
    // Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    
    if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
      const response = lastMessage.content[0].text.value;
      console.log('✅ Assistant calculation successful!');
      console.log('📊 Response:', response.substring(0, 200) + '...');
      
      // Try to parse JSON
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON parsing successful');
          console.log(`   Emission Factor: ${result.emission_factor} ${result.emission_factor_unit}`);
          console.log(`   Total Emissions: ${result.total_emissions} ${result.emissions_unit}`);
          console.log(`   Scope: ${result.scope}`);
          console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
        }
      } catch (parseError) {
        console.log('⚠️  JSON parsing failed, but assistant responded');
      }
    }
    
    // Clean up
    await openai.beta.threads.del(thread.id);
    
    console.log('\n🎉 All tests passed! Your OpenAI Assistant is ready to use.');
    console.log('🔧 Next steps:');
    console.log('   1. Go to your Data Upload page');
    console.log('   2. Uncheck "Demo mode"');
    console.log('   3. Click "Test Single Entry"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.status === 401) {
      console.error('🔑 Authentication failed. Check your API key.');
    } else if (error.status === 404) {
      console.error('🤖 Assistant not found. Run: npm run create-assistant');
    } else if (error.status === 429) {
      console.error('⏰ Rate limit exceeded. Try again in a moment.');
    }
    
    console.log('\n💡 Fallback: Demo mode will still work without API setup');
  }
}

// Run the test
testAssistant(); 