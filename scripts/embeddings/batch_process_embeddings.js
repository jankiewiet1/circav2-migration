const fetch = require('node-fetch');
const readline = require('readline');

// Configuration
const SUPABASE_URL = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES_MS = 2000;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get API key from user
function getApiKey() {
  return new Promise((resolve) => {
    rl.question('Enter your Supabase service role key: ', (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to ask yes/no question
function askYesNo(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Process a batch of emission factors
async function processBatch(serviceRoleKey) {
  try {
    console.log(`\nProcessing batch of up to ${BATCH_SIZE} emission factors...`);
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generateEmbeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ batchSize: BATCH_SIZE })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error (${response.status}): ${errorText}`);
      return { processed: 0, total: 0, success: false };
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error(`Function returned error: ${result.error}`);
      return { processed: 0, total: 0, success: false };
    }
    
    // Display processing results
    console.log(`\n✓ Processed ${result.processed} emission factors`);
    
    if (result.results && result.results.length > 0) {
      let successCount = 0;
      let failCount = 0;
      
      result.results.forEach(item => {
        if (item.success) {
          successCount++;
        } else {
          failCount++;
          console.log(`  - Failed for ID ${item.id}: ${item.error || 'Unknown error'}`);
        }
      });
      
      console.log(`  ✓ ${successCount} successful, ✗ ${failCount} failed`);
    }
    
    // Get remaining count
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/emission_factors?select=count&embedding=is.null`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );
    
    let remaining = 0;
    if (countResponse.ok) {
      remaining = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0');
    }
    
    return { 
      processed: result.processed || 0, 
      remaining,
      success: true 
    };
  } catch (error) {
    console.error('Error processing batch:', error.message);
    return { processed: 0, total: 0, success: false };
  }
}

// Main function
async function main() {
  console.log('========================================');
  console.log('Emission Factor Embedding Batch Processor');
  console.log('========================================\n');
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || await getApiKey();
  
  if (!serviceRoleKey) {
    console.error('No API key provided. Exiting.');
    rl.close();
    return;
  }
  
  console.log('Starting batch processing...');
  
  let continueProcessing = true;
  let totalProcessed = 0;
  let batchCount = 0;
  
  while (continueProcessing) {
    batchCount++;
    console.log(`\n[Batch ${batchCount}]`);
    
    const result = await processBatch(serviceRoleKey);
    
    if (result.success) {
      totalProcessed += result.processed;
      
      console.log(`\nTotal processed so far: ${totalProcessed}`);
      console.log(`Remaining: ${result.remaining}`);
      
      if (result.processed === 0 || result.remaining === 0) {
        console.log('\n✓ All emission factors have been processed!');
        continueProcessing = false;
      } else {
        // Add delay between batches
        if (continueProcessing) {
          console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES_MS/1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
        
        // Ask if user wants to continue after every 5 batches
        if (batchCount % 5 === 0) {
          continueProcessing = await askYesNo('\nContinue processing more batches?');
        }
      }
    } else {
      // On error, ask if user wants to retry
      continueProcessing = await askYesNo('Error processing batch. Retry?');
    }
  }
  
  console.log('\n========================================');
  console.log(`Processing complete. Total processed: ${totalProcessed}`);
  console.log('========================================');
  
  rl.close();
}

// Run the program
main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
}); 