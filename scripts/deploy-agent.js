import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask user for input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deployAgent() {
  try {
    console.log('📦 Starting Carbon Data Recognition Agent deployment...');
    
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
      console.error('❌ No OpenAI API key provided. Cannot deploy agent.');
      return;
    }
    
    // 2. Set up the Python virtual environment
    console.log('🐍 Setting up Python environment...');
    
    try {
      // Check if virtual environment exists
      if (!fs.existsSync('.venv')) {
        console.log('Creating virtual environment...');
        execSync('python -m venv .venv', { stdio: 'inherit' });
      }
      
      // Activate virtual environment and install dependencies
      console.log('Installing dependencies...');
      const activateCmd = process.platform === 'win32' ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';
      
      if (process.platform === 'win32') {
        execSync(`${activateCmd} && pip install openai-agents`, { stdio: 'inherit', shell: true });
      } else {
        execSync(`${activateCmd} && pip install openai-agents`, { stdio: 'inherit', shell: 'bash' });
      }
    } catch (error) {
      console.error('❌ Error setting up Python environment:', error.message);
      return;
    }
    
    // 3. Deploy the agent to OpenAI
    console.log('🚀 Deploying Carbon Data Recognition Agent...');
    
    try {
      // Set the OpenAI API key for deployment
      const envSetCmd = process.platform === 'win32' ? `set OPENAI_API_KEY=${apiKey}` : `export OPENAI_API_KEY=${apiKey}`;
      const activateCmd = process.platform === 'win32' ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';
      
      // Create agent deployment command
      // Note: For actual deployment, this would use the OpenAI Agents CLI when it's available
      const deployCmd = `${activateCmd} && ${envSetCmd} && python src/agents/data-recognition/agent.py`;
      
      // Run the deployment command
      if (process.platform === 'win32') {
        execSync(deployCmd, { stdio: 'inherit', shell: true });
      } else {
        execSync(deployCmd, { stdio: 'inherit', shell: 'bash' });
      }
      
      console.log('✅ Agent deployed successfully!');
    } catch (error) {
      console.error('❌ Error deploying agent:', error.message);
      return;
    }
    
    console.log('📝 Adding agent deployment script to package.json...');
    
    try {
      // Add the deployment script to package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (!packageJson.scripts['deploy:agent']) {
        packageJson.scripts['deploy:agent'] = 'node scripts/deploy-agent.js';
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Added deploy:agent script to package.json');
      } else {
        console.log('ℹ️ deploy:agent script already exists in package.json');
      }
    } catch (error) {
      console.error('❌ Error updating package.json:', error.message);
    }
    
    console.log('\n✨ Carbon Data Recognition Agent setup completed!');
    console.log('\nYou can now use the agent in your application.');
    console.log('To deploy the agent again in the future, run: npm run deploy:agent');
    
  } catch (error) {
    console.error('❌ Error during agent deployment:', error.message);
  } finally {
    rl.close();
  }
}

// Run the deployment
deployAgent(); 