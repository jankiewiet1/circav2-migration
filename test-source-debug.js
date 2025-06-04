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

async function debugSourceIssue() {
  console.log('🔍 Debugging source display issue...\n');
  
  try {
    // Step 1: Create a RAG calculation that saves to database
    console.log('Step 1: Creating RAG calculation...');
    const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw_input: 'Natural gas consumption 4684.2 m3 for heating test',
        company_id: 'test-company-debug',
        entry_id: 'test-entry-debug-' + Date.now(),
        demo_mode: false
      })
    });
    
    if (ragResponse.ok) {
      const ragResult = await ragResponse.json();
      if (ragResult.success) {
        console.log('✅ RAG calculation successful');
        console.log('   Calculation ID:', ragResult.calculation_id);
        console.log('   Source returned by RAG:', ragResult.matched_factor?.source);
        
        // Step 2: Check what was actually saved in the database
        console.log('\nStep 2: Checking database record...');
        const { data: dbRecord, error: dbError } = await supabase
          .from('emission_calc')
          .select('*')
          .eq('id', ragResult.calculation_id)
          .single();
          
        if (dbError) {
          console.log('❌ Error fetching DB record:', dbError);
        } else {
          console.log('✅ Database record found:');
          console.log('   Main source field:', dbRecord.source);
          console.log('   Calculation method:', dbRecord.calculation_method);
          console.log('   Activity data source:', dbRecord.activity_data?.source);
          console.log('   Factor details source:', dbRecord.activity_data?.factor_details?.source);
          console.log('   Emission factor:', dbRecord.activity_data?.emission_factor);
          console.log('   Emission factor unit:', dbRecord.activity_data?.emission_factor_unit);
          
          // Step 3: Simulate frontend processing logic
          console.log('\nStep 3: Simulating frontend processing...');
          
          let properSource = 'Unknown';
          let emissionFactor = 0;
          let emissionFactorUnit = '';
          
          const calc = dbRecord;
          
          if (calc.calculation_method === 'RAG') {
            if (calc.activity_data?.source) {
              properSource = calc.activity_data.source;
              console.log('   ✅ Using activity_data.source:', properSource);
            } else if (calc.activity_data?.factor_details?.source) {
              properSource = calc.activity_data.factor_details.source;
              console.log('   ✅ Using factor_details.source:', properSource);
            } else if (calc.source && calc.source !== 'OPENAI_ASSISTANT_API') {
              properSource = calc.source;
              console.log('   ✅ Using main source field:', properSource);
            } else {
              properSource = 'RAG Database';
              console.log('   ⚠️ Fallback to RAG Database');
            }
            
            if (calc.activity_data?.emission_factor) {
              emissionFactor = calc.activity_data.emission_factor;
            }
            if (calc.activity_data?.emission_factor_unit) {
              emissionFactorUnit = calc.activity_data.emission_factor_unit;
            }
          }
          
          console.log('\nFinal frontend display values:');
          console.log('   Source:', properSource);
          console.log('   Factor:', emissionFactor, emissionFactorUnit);
          
          // If we're getting wrong sources, let's see what the issue is
          if (properSource === 'OpenAI Analysis' || properSource === 'Unknown') {
            console.log('\n❌ Found the issue! Debugging why source is wrong:');
            console.log('   calc.calculation_method:', calc.calculation_method);
            console.log('   calc.activity_data exists:', !!calc.activity_data);
            console.log('   calc.activity_data.source:', calc.activity_data?.source);
            console.log('   calc.activity_data.factor_details exists:', !!calc.activity_data?.factor_details);
            console.log('   calc.activity_data.factor_details.source:', calc.activity_data?.factor_details?.source);
            console.log('   calc.source:', calc.source);
            console.log('   source !== OPENAI_ASSISTANT_API:', calc.source !== 'OPENAI_ASSISTANT_API');
          }
        }
      } else {
        console.log('❌ RAG calculation failed:', ragResult.error);
      }
    } else {
      console.log('❌ RAG request failed:', ragResponse.status, ragResponse.statusText);
    }
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
  }
}

debugSourceIssue().catch(console.error); 