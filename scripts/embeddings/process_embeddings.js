const fs = require('fs');
const fetch = require('node-fetch');

// Function to get a Supabase client
async function getSupabaseClient() {
  const supabaseUrl = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
  
  // Get service role key from environment or prompt user
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.log('Please provide the SUPABASE_SERVICE_ROLE_KEY:');
    // You'd add code here to get user input in a real script
    return null;
  }
  
  return { supabaseUrl, serviceRoleKey };
}

// Call the function to process embeddings
async function processEmbeddings() {
  const { supabaseUrl, serviceRoleKey } = await getSupabaseClient();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase configuration');
    return;
  }
  
  try {
    // Call the edge function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generateEmbeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error calling function:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('Function result:', result);
    
    // Check how many entries were processed
    const processed = result.processed || 0;
    console.log(`Processed ${processed} entries`);
    
    if (processed > 0) {
      console.log('Continue processing more entries? (y/n)');
      // You'd add code here to get user input in a real script
      // If yes, call processEmbeddings() again
    } else {
      console.log('No more entries to process');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('Starting embedding generation process...');
processEmbeddings(); 