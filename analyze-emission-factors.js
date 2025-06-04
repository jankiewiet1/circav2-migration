import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

async function analyzeEmissionFactors() {
  console.log('🔍 Analyzing emission factors to understand perspective (producer vs consumer)...\n');
  
  try {
    // Get samples of different types of activities
    console.log('📋 Sample Activities and Units:');
    
    const { data: samples } = await supabase
      .from('emission_factor_db')
      .select('Activity, Fuel, Unit, EF_Value, description, scope')
      .limit(20);
    
    if (samples) {
      const activities = {};
      
      samples.forEach(record => {
        const activity = record.Activity;
        const unit = record.Unit;
        const key = `${activity} | ${unit}`;
        
        if (!activities[key]) {
          activities[key] = {
            count: 0,
            fuels: new Set(),
            ef_values: [],
            descriptions: []
          };
        }
        
        activities[key].count++;
        activities[key].fuels.add(record.Fuel);
        activities[key].ef_values.push(record.EF_Value);
        activities[key].descriptions.push(record.description);
      });
      
      console.log('\nActivity patterns found:');
      Object.entries(activities).forEach(([key, data]) => {
        console.log(`\n${key}`);
        console.log(`   Count: ${data.count}`);
        console.log(`   Fuels: ${Array.from(data.fuels).join(', ')}`);
        console.log(`   EF Range: ${Math.min(...data.ef_values)} - ${Math.max(...data.ef_values)}`);
        console.log(`   Sample: ${data.descriptions[0].substring(0, 100)}...`);
      });
    }
    
    // Look for electricity-specific patterns
    console.log('\n🔌 Searching for electricity-related patterns:');
    
    const electricitySearches = [
      'electricity',
      'power',
      'grid',
      'kwh',
      'mwh'
    ];
    
    for (const term of electricitySearches) {
      const { data: electricRecords } = await supabase
        .from('emission_factor_db')
        .select('Activity, Fuel, Unit, EF_Value, description, scope')
        .or(`Activity.ilike.%${term}%,Fuel.ilike.%${term}%,description.ilike.%${term}%,Unit.ilike.%${term}%`)
        .limit(5);
      
      if (electricRecords && electricRecords.length > 0) {
        console.log(`\n--- ${term.toUpperCase()} Results ---`);
        electricRecords.forEach(record => {
          console.log(`   Activity: ${record.Activity}`);
          console.log(`   Fuel: ${record.Fuel}`);
          console.log(`   Unit: ${record.Unit}`);
          console.log(`   EF Value: ${record.EF_Value}`);
          console.log(`   Scope: ${record.scope}`);
          console.log(`   Description: ${record.description.substring(0, 150)}...`);
          console.log('   ---');
        });
      }
    }
    
    // Analyze units to understand perspective
    console.log('\n📏 Unit Analysis (to understand perspective):');
    
    const { data: allRecords } = await supabase
      .from('emission_factor_db')
      .select('Unit, Activity, Fuel')
      .limit(1000);
    
    if (allRecords) {
      const unitCounts = {};
      
      allRecords.forEach(record => {
        const unit = record.Unit;
        unitCounts[unit] = (unitCounts[unit] || 0) + 1;
      });
      
      const sortedUnits = Object.entries(unitCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);
      
      console.log('Most common units:');
      sortedUnits.forEach(([unit, count]) => {
        console.log(`   ${unit}: ${count} records`);
      });
    }
    
    console.log('\n💡 Analysis Questions:');
    console.log('   1. Are units like "TJ/kt" or "kg/kg" for PRODUCERS (direct combustion)?');
    console.log('   2. Are units like "kg CO2e/kWh" for CONSUMERS (purchased electricity)?');
    console.log('   3. Does "1.A - Fuel Combustion Activities" mean DIRECT combustion (Scope 1)?');
    console.log('   4. Or are these consumption factors for end-users (Scope 2)?');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeEmissionFactors().catch(console.error); 