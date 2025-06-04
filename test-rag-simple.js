import { createClient } from '@supabase/supabase-js';

async function testRAG() {
  console.log('🧪 Testing RAG function with proper validation ranges...\n');
  
  try {
    // Use the anon key to test the function
    const response = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU',
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