import { createClient } from '@supabase/supabase-js';


// Environment variables check
if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY environment variable is required");
  console.error("Please set it in your environment");
  process.exit(1);
}
const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'process.env.SUPABASE_ANON_KEY'
);

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

async function testCalculationFunctions() {
  console.log('🧪 Testing calculation edge functions directly...\n');
  
  try {
    // Test 1: RAG Demo Mode (no database required)
    console.log('1️⃣ Testing RAG calculation in demo mode...');
    
    const ragTestData = {
      raw_input: "Office electricity consumption - 2500 kWh",
      demo_mode: true // This should bypass database requirements
    };
    
    try {
      const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify(ragTestData)
      });

      console.log(`RAG API Status: ${ragResponse.status}`);
      
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        console.log('✅ RAG Demo Response:');
        console.log(`   Success: ${ragData.success}`);
        console.log(`   Similarity Score: ${ragData.similarity_score?.toFixed(3) || 'N/A'}`);
        console.log(`   Confidence Score: ${ragData.confidence_score?.toFixed(3) || 'N/A'}`);
        console.log(`   Total Emissions: ${ragData.total_emissions || 'N/A'} ${ragData.emissions_unit || ''}`);
        console.log(`   Source: ${ragData.source || 'N/A'}`);
        console.log(`   Processing Time: ${ragData.processing_time_ms || 'N/A'}ms`);
        
        // Check if similarity is above/below threshold
        const threshold = 0.75;
        if (ragData.similarity_score >= threshold) {
          console.log(`✅ RAG similarity (${ragData.similarity_score.toFixed(3)}) >= threshold (${threshold}) - WOULD BE ACCEPTED`);
        } else {
          console.log(`⚠️ RAG similarity (${ragData.similarity_score?.toFixed(3) || 'N/A'}) < threshold (${threshold}) - WOULD FALL BACK TO OPENAI`);
        }
      } else {
        const errorText = await ragResponse.text();
        console.log('❌ RAG Demo failed:', errorText);
      }
    } catch (error) {
      console.log('❌ RAG Demo error:', error.message);
    }

    // Test 2: Different RAG inputs to check consistency
    console.log('\n2️⃣ Testing RAG with different inputs...');
    
    const testInputs = [
      "Natural gas heating - 1200 m3",
      "Business flight - 850 km", 
      "Diesel fuel - 150 liters",
      "District heating - 50 GJ"
    ];

    for (const [index, input] of testInputs.entries()) {
      console.log(`\n   Test ${index + 1}: ${input}`);
      
      try {
        const response = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            raw_input: input,
            demo_mode: true
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Similarity: ${data.similarity_score?.toFixed(3) || 'N/A'}, Emissions: ${data.total_emissions || 'N/A'} ${data.emissions_unit || ''}, Source: ${data.source || 'N/A'}`);
        } else {
          console.log(`   ❌ Failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test 3: Check emission factor database
    console.log('\n3️⃣ Checking emission factor database...');
    
    try {
      const { data: factorCount, error: countError } = await supabase
        .from('emission_factor_db')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log('❌ Error checking emission factors:', countError.message);
      } else {
        console.log(`✅ Found ${factorCount} emission factors in database`);
        
        // Check for factors with embeddings
        const { data: withEmbeddings, count: embeddingCount } = await supabase
          .from('emission_factor_db')
          .select('*', { count: 'exact', head: true })
          .not('embeddings', 'is', null);
        
        console.log(`✅ ${embeddingCount} factors have embeddings (${((embeddingCount / factorCount) * 100).toFixed(1)}%)`);
        
        // Show sample factors
        const { data: sampleFactors } = await supabase
          .from('emission_factor_db')
          .select('Activity, Fuel, EF_Value, Unit, Scope')
          .not('embeddings', 'is', null)
          .limit(5);
        
        if (sampleFactors && sampleFactors.length > 0) {
          console.log('\n   Sample emission factors:');
          sampleFactors.forEach((factor, i) => {
            console.log(`   ${i+1}. ${factor.Activity} - ${factor.Fuel}: ${factor.EF_Value} ${factor.Unit} (Scope ${factor.Scope || 'N/A'})`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Database check error:', error.message);
    }

    // Test 4: Check threshold configuration
    console.log('\n4️⃣ Summary and Issues Analysis...');
    console.log('Issues to investigate:');
    console.log('1. RAG calculations showing as successful but logs showing failures');
    console.log('2. OpenAI function giving different values and incorrect units');
    console.log('3. Inconsistency between calculation methods');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check the unifiedCalculationService.ts threshold logic');
    console.log('2. Verify unit conversion in both RAG and OpenAI functions');
    console.log('3. Ensure consistent data structure between both methods');
    console.log('4. Add better logging to identify where discrepancies occur');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testCalculationFunctions().catch(console.error); 