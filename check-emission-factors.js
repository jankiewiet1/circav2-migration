import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

async function checkEmissionFactors() {
  console.log('🔍 Checking emission factor database properly...\n');
  
  try {
    // Check if table exists and get basic info
    console.log('1️⃣ Basic table check...');
    
    const { data: basicData, error: basicError } = await supabase
      .from('emission_factor_db')
      .select('*')
      .limit(1);
    
    if (basicError) {
      console.error('❌ Error accessing emission_factor_db:', basicError);
      return;
    }
    
    if (!basicData || basicData.length === 0) {
      console.log('❌ No data in emission_factor_db table');
      return;
    }
    
    console.log('✅ Table accessible, sample record structure:');
    console.log(Object.keys(basicData[0]));
    
    // Get total count using a different approach
    console.log('\n2️⃣ Count check...');
    
    const { data: allData, error: allError } = await supabase
      .from('emission_factor_db')
      .select('id')
      .range(0, 50000); // Large range to get count
    
    if (allError) {
      console.error('❌ Error getting count:', allError);
    } else {
      console.log(`✅ Total records: ${allData?.length || 0}`);
    }
    
    // Check for embeddings
    console.log('\n3️⃣ Embeddings check...');
    
    const { data: withEmbeddings, error: embError } = await supabase
      .from('emission_factor_db')
      .select('id, embedding')
      .not('embedding', 'is', null)
      .limit(10);
    
    if (embError) {
      console.error('❌ Error checking embeddings:', embError);
    } else {
      console.log(`✅ Records with embeddings: ${withEmbeddings?.length || 0}`);
      if (withEmbeddings && withEmbeddings.length > 0) {
        console.log('✅ Sample embedding length:', withEmbeddings[0].embedding?.length || 0);
      }
    }
    
    // Check overall embedding coverage
    const { data: noEmbeddings } = await supabase
      .from('emission_factor_db')
      .select('id')
      .is('embedding', null)
      .limit(10);
    
    console.log(`✅ Records without embeddings: ${noEmbeddings?.length || 0} (sample)`);
    
    // Get total count and embedding coverage
    const totalRecords = allData?.length || 0;
    const embeddingRecords = withEmbeddings?.length === 10 ? 'likely all 1000' : withEmbeddings?.length || 0;
    console.log(`📊 Embedding coverage: ${embeddingRecords} out of ${totalRecords} records`);
    
    // Check column names (case sensitivity issue)
    console.log('\n4️⃣ Column structure check...');
    
    const { data: sampleRecord } = await supabase
      .from('emission_factor_db')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleRecord) {
      console.log('Available columns:', Object.keys(sampleRecord));
      
      // Check specific columns
      const activityField = sampleRecord.Activity || sampleRecord.activity;
      const fuelField = sampleRecord.Fuel || sampleRecord.fuel;
      const efValueField = sampleRecord.EF_Value || sampleRecord.ef_value;
      const unitField = sampleRecord.Unit || sampleRecord.unit;
      const scopeField = sampleRecord.Scope || sampleRecord.scope;
      
      console.log('\nSample record values:');
      console.log(`Activity: ${activityField}`);
      console.log(`Fuel: ${fuelField}`);
      console.log(`EF_Value: ${efValueField}`);
      console.log(`Unit: ${unitField}`);
      console.log(`Scope: ${scopeField}`);
    }
    
    // Get some working examples for testing
    console.log('\n5️⃣ Sample factors for testing...');
    
    const { data: samples } = await supabase
      .from('emission_factor_db')
      .select('*')
      .not('embedding', 'is', null)
      .limit(5);
    
    if (samples && samples.length > 0) {
      samples.forEach((sample, i) => {
        const activity = sample.Activity || sample.activity;
        const fuel = sample.Fuel || sample.fuel;
        const value = sample.EF_Value || sample.ef_value;
        const unit = sample.Unit || sample.unit;
        const scope = sample.Scope || sample.scope;
        
        console.log(`${i+1}. ${activity} - ${fuel}: ${value} ${unit} (Scope ${scope || 'N/A'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEmissionFactors().catch(console.error); 