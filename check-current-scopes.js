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

async function checkScopes() {
  console.log('🔍 Checking emission_factor_db structure and data...\n');
  
  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total records in emission_factor_db: ${totalCount}\n`);
    
    // Get sample records to understand structure
    console.log('📋 Sample records:');
    const { data: samples, error: sampleError } = await supabase
      .from('emission_factor_db')
      .select('*')
      .limit(10);
    
    if (sampleError) {
      console.error('❌ Error fetching samples:', sampleError);
      return;
    }
    
    samples?.forEach((record, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(`ID: ${record.id}`);
      console.log(`Source: ${record.source}`);
      console.log(`Activity: ${record.activity}`);
      console.log(`Fuel: ${record.fuel}`);
      console.log(`Description: ${record.description}`);
      console.log(`Unit: ${record.unit}`);
      console.log(`GHG Unit: ${record.ghg_unit}`);
      console.log(`EF Value: ${record.ef_value}`);
      console.log(`Scope: ${record.scope}`);
      console.log(`Country: ${record.country}`);
    });
    
    // Check scope distribution
    const { data: scopes, error: scopeError } = await supabase
      .from('emission_factor_db')
      .select('scope')
      .not('scope', 'is', null);
    
    if (scopes) {
      const scopeCounts = {};
      scopes.forEach(record => {
        const scope = record.scope || 'null';
        scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
      });
      
      console.log('\n📊 Current scope distribution:');
      Object.entries(scopeCounts).forEach(([scope, count]) => {
        console.log(`   ${scope}: ${count} records`);
      });
    }
    
    // Search for electricity-related entries with broader criteria
    console.log('\n🔌 Searching for electricity entries:');
    const { data: electricExamples } = await supabase
      .from('emission_factor_db')
      .select('description, activity, fuel, scope, unit, source')
      .or('description.ilike.%electricity%,activity.ilike.%electricity%,fuel.ilike.%electricity%,description.ilike.%kwh%,unit.ilike.%kwh%')
      .limit(5);
    
    if (electricExamples && electricExamples.length > 0) {
      electricExamples.forEach(entry => {
        console.log(`   ${entry.description} | Scope: ${entry.scope} | Unit: ${entry.unit} | Source: ${entry.source}`);
      });
    } else {
      console.log('   No electricity entries found with current search criteria');
    }
    
    // Search for gas entries
    console.log('\n🔥 Searching for gas entries:');
    const { data: gasExamples } = await supabase
      .from('emission_factor_db')
      .select('description, activity, fuel, scope, unit, source')
      .or('description.ilike.%gas%,activity.ilike.%gas%,fuel.ilike.%gas%')
      .limit(5);
    
    if (gasExamples && gasExamples.length > 0) {
      gasExamples.forEach(entry => {
        console.log(`   ${entry.description} | Scope: ${entry.scope} | Unit: ${entry.unit} | Source: ${entry.source}`);
      });
    } else {
      console.log('   No gas entries found with current search criteria');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkScopes().catch(console.error); 