import { createClient } from '@supabase/supabase-js';


// Environment variables check
if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY environment variable is required");
  console.error("Please set it in your environment");
  process.exit(1);
}
async function testRAG() {
  console.log('🧪 Testing RAG function with proper validation ranges...\n');
  
  try {
    // Use the anon key to test the function
    const response = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw_input: 'Natural gas consumption 4684.2 m3 for heating',
        demo_mode: true
      })
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      
      if (result.success) {
        console.log('\n✅ RAG test SUCCESSFUL!');
        console.log('   📊 Emission factor:', result.emission_factor, result.emission_factor_unit);
        console.log('   💨 Total emissions:', result.total_emissions, result.emissions_unit);
        console.log('   📚 Source:', result.source);
        console.log('   🎯 Confidence:', (result.confidence_score * 100).toFixed(1) + '%');
        console.log('   🔗 Similarity:', (result.similarity_score * 100).toFixed(1) + '%');
        console.log('   ⏱️  Processing time:', result.processing_time_ms + 'ms');
        console.log('   🔍 Matched activity:', result.matched_activity || 'N/A');
      } else {
        console.log('\n❌ RAG test failed:');
        console.log('   Error:', result.error);
        if (result.parsed_data) {
          console.log('   Parsed data:', result.parsed_data);
        }
        if (result.suggestion) {
          console.log('   Suggestion:', result.suggestion);
        }
      }
    } else {
      console.log('\n❌ HTTP Error:', response.status, response.statusText);
      console.log('Response body:', responseText);
    }
  } catch (error) {
    console.log('\n❌ Test error:', error.message);
  }
}

testRAG().catch(console.error); 