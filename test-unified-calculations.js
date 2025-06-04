import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU';

async function testUnifiedCalculations() {
  console.log('🧪 Testing unified calculation system...\n');
  
  const testCases = [
    {
      name: "Electricity Consumption",
      input: "Office electricity consumption - 2500 kWh",
      expectedUnit: "kg CO2e",
      expectedRange: [20, 30] // Rough expected range
    },
    {
      name: "Natural Gas Heating", 
      input: "Natural gas for heating - 1200 m3",
      expectedUnit: "kg CO2e",
      expectedRange: [30, 40]
    },
    {
      name: "Business Flight",
      input: "Business flight to London - 850 km", 
      expectedUnit: "kg CO2e",
      expectedRange: [200, 250]
    },
    {
      name: "Diesel Fuel",
      input: "Fleet diesel consumption - 150 liters",
      expectedUnit: "kg CO2e", 
      expectedRange: [40, 60]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔬 Testing: ${testCase.name}`);
    console.log(`   Input: ${testCase.input}`);
    
    // Test RAG calculation
    console.log('\n   📊 RAG Calculation:');
    try {
      const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          raw_input: testCase.input,
          demo_mode: true
        })
      });

      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        const similarity = ragData.similarity_score || 0;
        const confidence = ragData.confidence_score || 0;
        const emissions = ragData.total_emissions || 0;
        const unit = ragData.emissions_unit || 'unknown';
        const source = ragData.source || 'unknown';
        
        console.log(`   ✅ RAG Success:`);
        console.log(`      Similarity: ${similarity.toFixed(3)} (threshold: 0.75)`);
        console.log(`      Confidence: ${confidence.toFixed(3)}`);
        console.log(`      Emissions: ${emissions.toFixed(2)} ${unit}`);
        console.log(`      Source: ${source}`);
        console.log(`      Processing: ${ragData.processing_time_ms}ms`);
        
        // Check if above threshold
        if (similarity >= 0.75) {
          console.log(`      🎯 ABOVE THRESHOLD - Would be accepted`);
        } else {
          console.log(`      ⚠️  BELOW THRESHOLD - Would fall back to OpenAI`);
        }
        
        // Check if in expected range
        if (emissions >= testCase.expectedRange[0] && emissions <= testCase.expectedRange[1]) {
          console.log(`      ✅ Emissions in expected range`);
        } else {
          console.log(`      ⚠️  Emissions outside expected range (${testCase.expectedRange[0]}-${testCase.expectedRange[1]})`);
        }
        
        // Check unit consistency
        if (unit === testCase.expectedUnit) {
          console.log(`      ✅ Unit correct: ${unit}`);
        } else {
          console.log(`      ❌ Unit incorrect: got ${unit}, expected ${testCase.expectedUnit}`);
        }
        
      } else {
        const errorText = await ragResponse.text();
        console.log(`   ❌ RAG Failed: ${ragResponse.status} - ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ RAG Error: ${error.message}`);
    }

    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📋 Test Summary:');
  console.log('✅ RAG calculation system tested with multiple scenarios');
  console.log('🔍 Key findings:');
  console.log('   - RAG similarity scores should be >= 0.75 for acceptance');
  console.log('   - Units should be consistent (kg CO2e)');
  console.log('   - Sources should be properly identified (DEFRA, ADEME, etc.)');
  console.log('   - Processing times should be reasonable (< 5 seconds)');
  
  console.log('\n🔧 Next steps:');
  console.log('1. Verify OpenAI calculation consistency');
  console.log('2. Test threshold logic in unified service');
  console.log('3. Ensure proper fallback behavior');
  console.log('4. Check unit conversion consistency');
}

testUnifiedCalculations().catch(console.error); 