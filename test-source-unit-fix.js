import { createClient } from '@supabase/supabase-js';

const supabaseServiceRole = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTc3NTI1OSwiZXhwIjoyMDQ1MzUxMjU5fQ.5sM6VTXMfuMxRaHYnT1YEWBqz-t9vcMKj9PG5S_VRgE'
);

async function testSourceAndUnitFix() {
  console.log('🔧 Testing source and unit display fixes...\n');
  
  try {
    // Test RAG calculation with natural gas
    console.log('🧪 Testing RAG calculation...');
    const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTc3NTI1OSwiZXhwIjoyMDQ1MzUxMjU5fQ.5sM6VTXMfuMxRaHYnT1YEWBqz-t9vcMKj9PG5S_VRgE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw_input: 'Natural gas consumption 4684.2 m3 for heating',
        company_id: 'test-company-123',
        entry_id: 'test-entry-' + Date.now(),
        demo_mode: false
      })
    });
    
    if (ragResponse.ok) {
      const ragResult = await ragResponse.json();
      if (ragResult.success) {
        console.log('✅ RAG calculation successful!');
        console.log('   📊 Emission factor:', ragResult.calculation.emission_factor);
        console.log('   📏 Factor unit:', ragResult.calculation.emission_factor_unit);
        console.log('   📚 Source:', ragResult.matched_factor.source);
        console.log('   💨 Total emissions:', ragResult.calculation.total_emissions);
        
        // Now check the database to see what was saved
        console.log('\n🔍 Checking saved data in database...');
        const { data: savedCalc, error } = await supabaseServiceRole
          .from('emission_calc')
          .select('*')
          .eq('id', ragResult.calculation_id)
          .single();
          
        if (error) {
          console.log('❌ Error fetching saved calculation:', error);
        } else {
          console.log('📊 Saved calculation data:');
          console.log('   Source:', savedCalc.source);
          console.log('   Activity data source:', savedCalc.activity_data?.source);
          console.log('   Factor details source:', savedCalc.activity_data?.factor_details?.source);
          console.log('   Emission factor:', savedCalc.activity_data?.emission_factor);
          console.log('   Emission factor unit:', savedCalc.activity_data?.emission_factor_unit);
          console.log('   Raw quantity:', savedCalc.activity_data?.quantity, savedCalc.activity_data?.unit);
        }
      } else {
        console.log('❌ RAG calculation failed:', ragResult.error);
      }
    } else {
      console.log('❌ RAG request failed:', ragResponse.status, ragResponse.statusText);
    }
    
    // Test how the frontend would process this data
    console.log('\n🎨 Testing frontend data processing...');
    const { data: recentCalcs, error: fetchError } = await supabaseServiceRole
      .from('emission_calc')
      .select(`
        *,
        emission_entries (*)
      `)
      .eq('calculation_method', 'RAG')
      .order('calculated_at', { ascending: false })
      .limit(3);
      
    if (fetchError) {
      console.log('❌ Error fetching calculations:', fetchError);
    } else {
      console.log(`Found ${recentCalcs.length} recent RAG calculations for frontend testing:`);
      
      recentCalcs.forEach((calc, i) => {
        console.log(`\n${i + 1}. Frontend processed data:`);
        
        // Apply the same logic as in DataTraceability.tsx
        let properSource = 'Unknown';
        let emissionFactor = 0;
        let emissionFactorUnit = '';
        
        if (calc.calculation_method === 'RAG') {
          if (calc.activity_data?.source) {
            properSource = calc.activity_data.source;
          } else if (calc.activity_data?.factor_details?.source) {
            properSource = calc.activity_data.factor_details.source;
          } else if (calc.source && calc.source !== 'OPENAI_ASSISTANT_API') {
            properSource = calc.source;
          } else {
            properSource = 'RAG Database';
          }
          
          if (calc.activity_data?.emission_factor) {
            emissionFactor = calc.activity_data.emission_factor;
          }
          if (calc.activity_data?.emission_factor_unit) {
            emissionFactorUnit = calc.activity_data.emission_factor_unit;
          }
        }
        
        console.log(`   ✅ Processed source: ${properSource}`);
        console.log(`   ✅ Processed factor: ${emissionFactor} ${emissionFactorUnit}`);
        console.log(`   ✅ Total emissions: ${calc.total_emissions} ${calc.emissions_unit}`);
        console.log(`   ✅ Method: ${calc.calculation_method}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
  
  console.log('\n🎯 Source and unit fix test complete!');
}

testSourceAndUnitFix().catch(console.error); 