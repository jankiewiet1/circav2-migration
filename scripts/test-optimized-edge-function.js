import dotenv from 'dotenv';

dotenv.config();

async function testOptimizedEdgeFunction() {
  console.log('🧪 Testing optimized Edge Function with 500 records...');
  
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batchSize: 500 })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Test Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Processed: ${result.processed}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.success && result.processed > 0) {
      console.log('🎉 Optimized Edge Function is working correctly!');
      console.log('🚀 Ready to process remaining records with 500-record batches');
    } else if (result.success && result.processed === 0) {
      console.log('ℹ️  No records need processing (all embeddings already generated)');
    } else {
      console.log('❌ Test failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOptimizedEdgeFunction(); 