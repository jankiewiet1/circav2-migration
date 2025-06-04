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

async function checkEmbeddingStatus() {
  console.log('🔍 Checking embedding and data quality status...\n');
  
  try {
    // Get total records
    const { count: totalCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total records: ${totalCount}`);

    // Check records with embeddings
    const { count: embeddingCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true })
      .not('embeddings', 'is', null);

    console.log(`🧠 Records with embeddings: ${embeddingCount}`);

    // Check records with valid activity field
    const { count: activityCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true })
      .not('activity', 'is', null)
      .neq('activity', '');

    console.log(`🎯 Records with valid activity: ${activityCount}`);

    // Check records with valid ef_value
    const { count: efValueCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true })
      .not('ef_value', 'is', null)
      .gt('ef_value', 0);

    console.log(`💰 Records with valid ef_value: ${efValueCount}`);

    // Check records with valid unit
    const { count: unitCount } = await supabase
      .from('emission_factor_db')
      .select('*', { count: 'exact', head: true })
      .not('unit', 'is', null)
      .neq('unit', '');

    console.log(`📏 Records with valid unit: ${unitCount}`);

    // Get some records with valid data
    console.log('\n🔍 Sample records with valid data:');
    const { data: validRecords } = await supabase
      .from('emission_factor_db')
      .select('*')
      .not('activity', 'is', null)
      .not('ef_value', 'is', null)
      .not('unit', 'is', null)
      .limit(5);

    if (validRecords && validRecords.length > 0) {
      validRecords.forEach((record, i) => {
        console.log(`\n--- Valid Record ${i + 1} ---`);
        console.log(`Activity: ${record.activity}`);
        console.log(`Fuel: ${record.fuel}`);
        console.log(`EF Value: ${record.ef_value}`);
        console.log(`Unit: ${record.unit}`);
        console.log(`Scope: ${record.scope}`);
        console.log(`Has Embedding: ${!!record.embeddings}`);
      });
    } else {
      console.log('❌ No records found with valid activity, ef_value, and unit fields');
    }

    // Check if we can parse the description field to recover data
    console.log('\n🔧 Analyzing description field for data recovery:');
    const { data: descriptionSamples } = await supabase
      .from('emission_factor_db')
      .select('description, scope')
      .not('description', 'is', null)
      .limit(5);

    if (descriptionSamples) {
      descriptionSamples.forEach((record, i) => {
        console.log(`\n--- Description ${i + 1} ---`);
        console.log(`Description: ${record.description}`);
        console.log(`Scope: ${record.scope}`);
        
        // Try to parse the description
        const desc = record.description;
        const fuelMatch = desc.match(/Fuel:\s*([^|]+)/);
        const countryMatch = desc.match(/Country:\s*([^|]+)/);
        const gasMatch = desc.match(/Gas:\s*([^|]+)/);
        const unitMatch = desc.match(/Unit:\s*([^|]+)/);
        const sourceMatch = desc.match(/Source:\s*([^|]+)/);
        
        if (fuelMatch) console.log(`Parsed Fuel: ${fuelMatch[1].trim()}`);
        if (countryMatch) console.log(`Parsed Country: ${countryMatch[1].trim()}`);
        if (gasMatch) console.log(`Parsed Gas: ${gasMatch[1].trim()}`);
        if (unitMatch) console.log(`Parsed Unit: ${unitMatch[1].trim()}`);
        if (sourceMatch) console.log(`Parsed Source: ${sourceMatch[1].trim()}`);
      });
    }

    console.log('\n💡 Status Summary:');
    console.log(`   Data Quality: ${((activityCount || 0) / (totalCount || 1) * 100).toFixed(1)}% valid`);
    console.log(`   Embedding Progress: ${((embeddingCount || 0) / (totalCount || 1) * 100).toFixed(1)}% complete`);
    
    if ((activityCount || 0) < 1000) {
      console.log('\n⚠️ Warning: Most records appear to have missing or corrupted field data');
      console.log('   Recommendation: Restore from backup or reload emission factors database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEmbeddingStatus().catch(console.error); 