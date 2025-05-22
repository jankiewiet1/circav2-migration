import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask user for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deploySupabaseFunctions() {
  try {
    console.log('📦 Starting Supabase Edge Functions deployment...');
    
    // 1. Check if we have the OpenAI API key
    let apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Try to read from config.local.ts
      try {
        const configPath = path.join(process.cwd(), 'src', 'integrations', 'openai', 'config.local.ts');
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          const match = configContent.match(/OPENAI_API_KEY\s*=\s*["']([^"']+)["']/);
          
          if (match && match[1]) {
            apiKey = match[1];
            console.log('ℹ️ Found API key in config.local.ts');
          }
        }
      } catch (error) {
        console.error('ℹ️ Could not read API key from config.local.ts');
      }
    }
    
    if (!apiKey) {
      apiKey = await question('Enter your OpenAI API key: ');
    }
    
    if (!apiKey) {
      console.error('❌ No OpenAI API key provided. Cannot deploy functions.');
      rl.close();
      return;
    }
    
    // 2. Deploy the function
    console.log('🚀 Deploying Supabase Edge Functions...');
    
    try {
      // Set the OpenAI API key as a secret
      console.log('Setting OPENAI_API_KEY secret...');
      execSync(`npx supabase secrets set OPENAI_API_KEY="${apiKey}"`, { stdio: 'inherit' });
      
      // Deploy the function
      console.log('Deploying process-ai-data function...');
      execSync('npx supabase functions deploy process-ai-data', { stdio: 'inherit' });
      
      console.log('✅ Edge Functions deployed successfully!');
    } catch (error) {
      console.error('❌ Error deploying functions:', error.message);
      rl.close();
      return;
    }
    
    // 3. Deploy the Python agent (if the user wants to)
    const deployAgent = await question('Do you want to deploy the Carbon Data Agent as well? (y/n): ');
    
    if (deployAgent.toLowerCase() === 'y') {
      console.log('🤖 Deploying Carbon Data Agent...');
      
      try {
        // Run the agent deployment script
        execSync('node scripts/deploy-agent.js', { stdio: 'inherit' });
      } catch (error) {
        console.error('❌ Error deploying agent:', error.message);
      }
    }
    
    console.log('\n✨ Deployment completed!');
    console.log('\nYou can now use the Edge Functions in your application.');
    
    rl.close();
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
    rl.close();
  }
}

// Run the deployment
deploySupabaseFunctions(); 