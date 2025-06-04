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

async function checkTableStructure() {
  console.log('🔍 Checking emission_factor_db table structure...\n');
  
  try {
    // Get one record to see all available columns
    const { data: sample, error } = await supabase
      .from('emission_factor_db')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching sample:', error);
      return;
    }
    
    if (!sample || sample.length === 0) {
      console.log('❌ No data found in table');
      return;
    }
    
    const record = sample[0];
    console.log('📋 Available columns and sample values:');
    
    Object.keys(record).forEach(column => {
      const value = record[column];
      const type = typeof value;
      const displayValue = value === null ? 'NULL' : 
                          value === undefined ? 'UNDEFINED' :
                          type === 'string' && value.length > 100 ? `"${value.substring(0, 100)}..."` :
                          JSON.stringify(value);
      
      console.log(`   ${column}: ${displayValue} (${type})`);
    });
    
    // Check if there are any records with non-null values in key fields
    console.log('\n🔍 Checking for records with valid data...');
    
    const checks = ['activity', 'fuel', 'ef_value', 'unit', 'embeddings'];
    
    for (const field of checks) {
      if (record.hasOwnProperty(field)) {
        const { count } = await supabase
          .from('emission_factor_db')
          .select('*', { count: 'exact', head: true })
          .not(field, 'is', null);
        
        console.log(`   ${field}: ${count || 0} non-null records`);
      } else {
        console.log(`   ${field}: Column does not exist`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTableStructure().catch(console.error); 