import dotenv from 'dotenv';

dotenv.config();

const EDGE_FUNCTION_URL = `${process.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function testEdgeFunction() {
  try {
    console.log('🧪 Testing Edge Function with 5 records...');
    console.log(`URL: ${EDGE_FUNCTION_URL}`);
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize: 5
      }),
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Edge Function Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
  }
}

testEdgeFunction(); 