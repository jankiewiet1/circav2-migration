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

async function runAgent() {
  try {
    console.log('🤖 Carbon Data Recognition Agent');
    console.log('===============================');
    
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
      console.error('❌ No OpenAI API key provided. Cannot run agent.');
      rl.close();
      return;
    }
    
    // 2. Ask for the file to process
    const filePath = await question('Enter the path to the file you want to process (or press Enter for a demo): ');
    
    // 3. Run the agent
    console.log('🚀 Running Carbon Data Recognition Agent...');
    
    try {
      // Set the OpenAI API key for the agent
      const envSetCmd = process.platform === 'win32' ? `set OPENAI_API_KEY=${apiKey}` : `export OPENAI_API_KEY=${apiKey}`;
      const activateCmd = process.platform === 'win32' ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate';
      
      // Create agent run command
      let runCmd;
      if (filePath) {
        runCmd = `${activateCmd} && ${envSetCmd} && python src/agents/data-recognition/test_agent.py "${filePath}"`;
      } else {
        // Use demo mode - this will use the default example file
        runCmd = `${activateCmd} && ${envSetCmd} && python src/agents/data-recognition/test_agent.py`;
      }
      
      // Run the command
      if (process.platform === 'win32') {
        execSync(runCmd, { stdio: 'inherit', shell: true });
      } else {
        execSync(runCmd, { stdio: 'inherit', shell: 'bash' });
      }
      
    } catch (error) {
      console.error('❌ Error running agent:', error.message);
    }
    
    // 4. Ask if user wants to continue
    const runAgain = await question('\nDo you want to process another file? (y/n): ');
    
    if (runAgain.toLowerCase() === 'y') {
      rl.close();
      // Re-run the script
      execSync('node scripts/run-agent.js', { stdio: 'inherit' });
      return;
    }
    
    console.log('\n✨ Thank you for using the Carbon Data Recognition Agent!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the agent
runAgent(); 