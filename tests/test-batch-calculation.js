import { supabase } from '../src/integrations/supabase/client.js';
import { ClimatiqEmissionService } from '../src/services/emissionService.js';

/**
 * Test script to verify batch calculation functionality
 * Run with: node tests/test-batch-calculation.js
 */
async function testBatchCalculation() {
  console.log('🧪 Testing batch calculation functionality...');
  
  // 1. Check if we're authenticated
  console.log('\n🔑 Checking authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('❌ Authentication error:', authError.message);
    console.log('⚠️ You need to be logged in to run this test. Please authenticate first.');
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
  
  // 3. Check for unmatched emission entries
  console.log('\n📋 Checking for unmatched emission entries...');
  const { data: entries, error: entriesError } = await supabase
    .from('emission_entries')
    .select('id, category, unit, quantity')
    .eq('company_id', companyId)
    .eq('match_status', 'unmatched')
    .limit(5);
  
  if (entriesError) {
    console.error('❌ Error fetching emission entries:', entriesError.message);
    return;
  }
  
  if (!entries || entries.length === 0) {
    console.log('⚠️ No unmatched emission entries found. Creating a test entry...');
    
    // Create a test emission entry
    const { data: newEntry, error: newEntryError } = await supabase
      .from('emission_entries')
      .insert({
        company_id: companyId,
        category: 'Electricity',
        unit: 'kWh',
        quantity: 1000,
        match_status: 'unmatched',
        date: new Date().toISOString()
      })
      .select();
    
    if (newEntryError) {
      console.error('❌ Error creating test entry:', newEntryError.message);
      return;
    }
    
    console.log('✅ Created test emission entry:', newEntry[0]);
    entries.push(newEntry[0]);
  } else {
    console.log(`✅ Found ${entries.length} unmatched emission entries`);
  }
  
  // 4. Run batch calculation
  console.log('\n🔄 Running batch calculation...');
  try {
    const result = await ClimatiqEmissionService.calculateFromEmissionEntries(companyId);
    console.log('✅ Batch calculation complete:', result);
    
    // 5. Verify calculations were saved
    if (result.succeeded > 0) {
      console.log('\n🔍 Checking for saved calculations...');
      const processedEntryId = result.details.find(d => d.success)?.entryId;
      
      if (processedEntryId) {
        const { data: calculations, error: calcError } = await supabase
          .from('emission_calc_climatiq')
          .select('*')
          .eq('entry_id', processedEntryId);
        
        if (calcError) {
          console.error('❌ Error fetching calculations:', calcError.message);
        } else if (calculations && calculations.length > 0) {
          console.log('✅ Found saved calculations:', calculations);
        } else {
          console.error('❌ No calculations found for processed entry');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error running batch calculation:', error.message);
    console.log('Error details:', error);
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testBatchCalculation()
  .catch(err => {
    console.error('Test failed with error:', err);
  }); 