import { supabase } from '../src/integrations/supabase/client.js';

/**
 * Test script to verify Climatiq integration
 * Run with: node tests/verify-climatiq-setup.js
 */
async function verifyClimatiqSetup() {
  console.log('🧪 Testing Climatiq integration setup...');
  
  // 1. Check if table exists
  console.log('\n📋 Checking if emission_calc_climatiq table exists...');
  try {
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'emission_calc_climatiq')
      .single();
    
    if (tableError) {
      console.error('❌ Error checking table existence:', tableError.message);
    } else if (tables) {
      console.log('✅ Table emission_calc_climatiq exists');
    } else {
      console.error('❌ Table emission_calc_climatiq does not exist');
      return;
    }
  } catch (error) {
    console.error('❌ Error checking table existence:', error.message);
  }
  
  // 2. Try to insert test data
  console.log('\n📝 Attempting to insert test data...');
  const testData = {
    company_id: '', // You need to fill this with a valid company ID
    entry_id: null, // Test with manual calculation (null entry_id)
    total_emissions: 100.5,
    emissions_unit: 'kg',
    climatiq_category: 'Test Category',
    climatiq_activity_id: 'test-activity-id',
    scope: 1
  };
  
  // First, get a valid company ID
  console.log('\n🏢 Fetching a valid company ID...');
  try {
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
      
    if (companyError) {
      console.error('❌ Error fetching companies:', companyError.message);
      return;
    }
    
    if (!companies || companies.length === 0) {
      console.error('❌ No companies found. Please create a company first.');
      return;
    }
    
    testData.company_id = companies[0].id;
    console.log(`✅ Using company ID: ${testData.company_id}`);
    
    // Insert test data
    const { data: insertData, error: insertError } = await supabase
      .from('emission_calc_climatiq')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting test data:', insertError.message);
      if (insertError.message.includes('policy')) {
        console.log('⚠️ This might be due to RLS policies. Check if you\'re authenticated and have proper permissions.');
      }
    } else {
      console.log('✅ Successfully inserted test data:', insertData);
      
      // 3. Clean up test data
      console.log('\n🧹 Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('emission_calc_climatiq')
        .delete()
        .eq('id', insertData[0].id);
        
      if (deleteError) {
        console.error('❌ Error deleting test data:', deleteError.message);
      } else {
        console.log('✅ Successfully deleted test data');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // 4. Check RLS policies
  console.log('\n🔒 Checking RLS policies...');
  const { data: policies, error: policyError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'emission_calc_climatiq' });
  
  if (policyError) {
    console.error('❌ Error checking policies:', policyError.message);
    console.log('⚠️ The get_policies_for_table function might not exist. Check your Supabase configuration.');
  } else if (policies && policies.length > 0) {
    console.log('✅ Found RLS policies:', policies);
  } else {
    console.log('⚠️ No RLS policies found for emission_calc_climatiq table');
  }
  
  console.log('\n✨ Verification complete!');
}

// Run the verification
verifyClimatiqSetup()
  .catch(err => {
    console.error('Verification failed with error:', err);
  }); 