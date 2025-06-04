import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

async function checkCurrentData() {
  console.log('🔍 Comprehensive data analysis...\n');
  
  try {
    // Check emission_entries
    console.log('📋 EMISSION ENTRIES:');
    const { data: entries } = await supabase
      .from('emission_entries')
      .select('*')
      .limit(10);
    
    if (entries && entries.length > 0) {
      console.log(`Found ${entries.length} entries (showing first 10):`);
      entries.forEach((entry, i) => {
        console.log(`${i+1}. ID: ${entry.id}`);
        console.log(`   Date: ${entry.date}`);
        console.log(`   Description: ${entry.description}`);
        console.log(`   Quantity: ${entry.quantity} ${entry.unit}`);
        console.log(`   Category: ${entry.category}`);
        console.log(`   Scope: ${entry.scope}`);
        console.log(`   Match Status: ${entry.match_status}`);
        console.log('');
      });
    } else {
      console.log('No emission entries found');
    }

    // Check emission_calc
    console.log('\n🧮 EMISSION CALCULATIONS:');
    const { data: calculations } = await supabase
      .from('emission_calc')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(10);
    
    if (calculations && calculations.length > 0) {
      console.log(`Found ${calculations.length} calculations (showing first 10):`);
      calculations.forEach((calc, i) => {
        console.log(`${i+1}. ID: ${calc.id}`);
        console.log(`   Entry ID: ${calc.entry_id}`);
        console.log(`   Method: ${calc.calculation_method}`);
        console.log(`   Total Emissions: ${calc.total_emissions}`);
        console.log(`   Calculated At: ${calc.calculated_at}`);
        console.log(`   Similarity Score: ${calc.similarity_score}`);
        console.log(`   Processing Time: ${calc.processing_time_ms}`);
        
        if (calc.activity_data) {
          try {
            const activityData = typeof calc.activity_data === 'string' 
              ? JSON.parse(calc.activity_data) 
              : calc.activity_data;
            console.log(`   Activity Data: ${JSON.stringify(activityData, null, 2)}`);
          } catch (e) {
            console.log(`   Activity Data (raw): ${calc.activity_data}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('No calculations found');
    }

    // Check calculation methods breakdown
    console.log('\n📊 CALCULATION METHODS BREAKDOWN:');
    const { data: methodStats } = await supabase
      .from('emission_calc')
      .select('calculation_method, similarity_score, total_emissions');
    
    if (methodStats) {
      const ragCalcs = methodStats.filter(c => c.calculation_method === 'RAG');
      const openaiCalcs = methodStats.filter(c => c.calculation_method === 'OPENAI');
      
      console.log(`RAG Calculations: ${ragCalcs.length}`);
      if (ragCalcs.length > 0) {
        const avgSimilarity = ragCalcs.reduce((sum, c) => sum + (c.similarity_score || 0), 0) / ragCalcs.length;
        const avgEmissions = ragCalcs.reduce((sum, c) => sum + (c.total_emissions || 0), 0) / ragCalcs.length;
        console.log(`  Avg Similarity: ${avgSimilarity.toFixed(3)}`);
        console.log(`  Avg Emissions: ${avgEmissions.toFixed(2)}`);
      }
      
      console.log(`OpenAI Calculations: ${openaiCalcs.length}`);
      if (openaiCalcs.length > 0) {
        const avgEmissions = openaiCalcs.reduce((sum, c) => sum + (c.total_emissions || 0), 0) / openaiCalcs.length;
        console.log(`  Avg Emissions: ${avgEmissions.toFixed(2)}`);
      }
    }

    // Check for specific issues
    console.log('\n🔍 POTENTIAL ISSUES:');
    
    // Check for zero emissions
    const { data: zeroEmissions } = await supabase
      .from('emission_calc')
      .select('*')
      .eq('total_emissions', 0);
    
    if (zeroEmissions && zeroEmissions.length > 0) {
      console.log(`⚠️  Found ${zeroEmissions.length} calculations with zero emissions`);
    }

    // Check for missing similarity scores in RAG calculations
    const { data: missingSimilarity } = await supabase
      .from('emission_calc')
      .select('*')
      .eq('calculation_method', 'RAG')
      .is('similarity_score', null);
    
    if (missingSimilarity && missingSimilarity.length > 0) {
      console.log(`⚠️  Found ${missingSimilarity.length} RAG calculations without similarity scores`);
    }

    // Check recent calculation attempts
    console.log('\n🕐 RECENT CALCULATIONS (last 5):');
    const { data: recent } = await supabase
      .from('emission_calc')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(5);
    
    if (recent) {
      recent.forEach((calc, i) => {
        console.log(`${i+1}. ${calc.calculation_method}: ${calc.total_emissions} kg CO2e (${calc.calculated_at})`);
        if (calc.calculation_method === 'RAG') {
          console.log(`    Similarity: ${calc.similarity_score || 'N/A'}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentData().catch(console.error); 