// Simple test script to verify emission entries processing

// Direct Supabase client instantiation for testing
import { createClient } from '@supabase/supabase-js';

// Supabase project credentials - copied from src/integrations/supabase/client.ts
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key-here";

// Create the Supabase client directly
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
    }
  }
);

/**
 * Simple test script to process emission entries
 */
async function testEmissionProcessing() {
  console.log('🧪 Testing emission entries processing...');
  
  // 1. Check authentication status
  console.log('\n🔑 Checking authentication status...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('❌ Authentication error:', authError.message);
    console.log('⚠️ You need to be logged in to run this test. Please authenticate in the application first.');
    return;
  }
  
  if (!user) {
    console.error('❌ Not authenticated. Please log in first.');
    return;
  }
  
  console.log(`✅ Authenticated as ${user.email}`);
  
  // 2. Get a company to test with
  console.log('\n🏢 Fetching a company to test with...');
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1);
  
  if (companyError) {
    console.error('❌ Error fetching company:', companyError.message);
    return;
  }
  
  if (!companies || companies.length === 0) {
    console.error('❌ No companies found. Please create a company first.');
    return;
  }
  
  const companyId = companies[0].id;
  console.log(`✅ Using company: ${companies[0].name} (${companyId})`);
  
  // 3. Check for emission entries
  console.log('\n📋 Checking for emission entries...');
  const { data: entries, error: entriesError } = await supabase
    .from('emission_entries')
    .select('id, category, unit, quantity, match_status')
    .eq('company_id', companyId)
    .limit(5);
  
  if (entriesError) {
    console.error('❌ Error fetching emission entries:', entriesError.message);
    return;
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️ No emission entries found for this company.');
    return;
  }
  
  console.log(`✅ Found ${entries.length} emission entries. Sample entry:`, entries[0]);
  
  // 4. Check for unmatched entries
  const unmatchedEntries = entries.filter(entry => entry.match_status === 'unmatched');
  console.log(`📊 Found ${unmatchedEntries.length} unmatched entries out of ${entries.length} total.`);
  
  // 5. Try to process an unmatched entry manually (if any)
  if (unmatchedEntries.length > 0) {
    const testEntry = unmatchedEntries[0];
    console.log('\n🔄 Processing an unmatched entry:', testEntry);
    
    // 6. Create a manual calculation record
    console.log('\n📝 Creating a calculation record for this entry...');
    
    const calculationData = {
      company_id: companyId,
      entry_id: testEntry.id,
      total_emissions: testEntry.quantity * 0.5, // Simplified calculation factor
      emissions_unit: 'kg',
      climatiq_category: testEntry.category || 'Manual Category',
      climatiq_activity_id: 'manual-test-calculation',
      scope: 1  // Assuming scope 1 for test purposes
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('emission_calc_climatiq')
      .insert(calculationData)
      .select();
    
    if (insertError) {
      console.error('❌ Error creating calculation record:', insertError.message);
    } else if (insertResult && insertResult.length > 0) {
      console.log('✅ Successfully created calculation record:', insertResult[0]);
      
      // 7. Update the emission entry match status
      console.log('\n📝 Updating emission entry match status...');
      const { error: updateError } = await supabase
        .from('emission_entries')
        .update({ match_status: 'matched' })
        .eq('id', testEntry.id);
      
      if (updateError) {
        console.error('❌ Error updating emission entry:', updateError.message);
      } else {
        console.log('✅ Successfully updated emission entry match status to "matched"');
      }
      
      // 8. Verify calculation exists
      console.log('\n🔍 Verifying calculation exists...');
      const { data: calculations, error: calcError } = await supabase
        .from('emission_calc_climatiq')
        .select('*')
        .eq('entry_id', testEntry.id);
      
      if (calcError) {
        console.error('❌ Error fetching calculations:', calcError.message);
      } else if (calculations && calculations.length > 0) {
        console.log('✅ Found calculation:', calculations[0]);
      } else {
        console.log('⚠️ No calculations found for this entry.');
      }
    } else {
      console.log('⚠️ Insert succeeded but no data returned');
    }
  } else {
    console.log('⚠️ No unmatched entries to process.');
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testEmissionProcessing()
  .catch(err => {
    console.error('Test failed with error:', err);
  }); 