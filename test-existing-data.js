import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

async function examineExistingData() {
  console.log('🔍 Examining existing calculation data to debug source issue...\n');
  
  try {
    // Get recent calculations from the database
    console.log('Step 1: Fetching recent calculations...');
    const { data: calculations, error } = await supabase
      .from('emission_calc')
      .select(`
        *,
        emission_entries (*)
      `)
      .order('calculated_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.log('❌ Error fetching calculations:', error);
      return;
    }
    
    if (!calculations || calculations.length === 0) {
      console.log('❌ No calculations found in database');
      return;
    }
    
    console.log(`✅ Found ${calculations.length} calculations\n`);
    
    calculations.forEach((calc, i) => {
      console.log(`--- Calculation ${i + 1} ---`);
      console.log('ID:', calc.id);
      console.log('Method:', calc.calculation_method);
      console.log('Main source field:', calc.source);
      console.log('Activity data exists:', !!calc.activity_data);
      
      if (calc.activity_data) {
        console.log('Activity data source:', calc.activity_data.source);
        console.log('Activity data emission_factor:', calc.activity_data.emission_factor);
        console.log('Activity data emission_factor_unit:', calc.activity_data.emission_factor_unit);
        console.log('Factor details exists:', !!calc.activity_data.factor_details);
        
        if (calc.activity_data.factor_details) {
          console.log('Factor details source:', calc.activity_data.factor_details.source);
        }
      }
      
      // Apply the same frontend logic
      console.log('\n🎨 Frontend processing simulation:');
      
      let properSource = 'Unknown';
      let emissionFactor = 0;
      let emissionFactorUnit = '';
      
      if (calc.calculation_method === 'RAG') {
        console.log('   Processing as RAG calculation...');
        
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
      } else if (calc.calculation_method === 'OPENAI') {
        console.log('   Processing as OpenAI calculation...');
        
        if (calc.activity_data?.emission_factor_info?.source) {
          properSource = calc.activity_data.emission_factor_info.source;
          console.log('   ✅ Using emission_factor_info.source:', properSource);
        } else if (calc.request_params?.emission_factor_source) {
          properSource = calc.request_params.emission_factor_source;
          console.log('   ✅ Using request_params source:', properSource);
        } else {
          properSource = 'OpenAI Analysis';
          console.log('   ⚠️ Fallback to OpenAI Analysis');
        }
        
        if (calc.activity_data?.emission_factor_info?.value) {
          emissionFactor = calc.activity_data.emission_factor_info.value;
        } else if (calc.activity_data?.emission_factor) {
          emissionFactor = calc.activity_data.emission_factor;
        }
        
        if (calc.activity_data?.emission_factor_info?.unit) {
          emissionFactorUnit = calc.activity_data.emission_factor_info.unit;
        } else if (calc.activity_data?.emission_factor_unit) {
          emissionFactorUnit = calc.activity_data.emission_factor_unit;
        }
      }
      
      console.log('FINAL FRONTEND VALUES:');
      console.log('   Source:', properSource);
      console.log('   Factor:', emissionFactor, emissionFactorUnit);
      console.log('   Total emissions:', calc.total_emissions, calc.emissions_unit);
      
      if (properSource === 'OpenAI Analysis' && calc.calculation_method === 'RAG') {
        console.log('\n❌ ISSUE FOUND: RAG calculation showing as OpenAI Analysis!');
        console.log('   This means the activity_data.source is missing or null');
        console.log('   And the main source field is probably "OPENAI_ASSISTANT_API"');
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    });
    
  } catch (error) {
    console.log('❌ Examination error:', error.message);
  }
}

examineExistingData().catch(console.error); 