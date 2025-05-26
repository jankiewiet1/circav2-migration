import { ClimatiqEmissionService } from '../src/services/emissionService';
import { supabase } from '../src/integrations/supabase/client';
import { Scope, EmissionSource } from '../src/types/emissions';

/**
 * Test script to verify manual calculations using Climatiq API
 * Run with: node tests/test-manual-calculation.js
 */
async function testManualCalculations() {
  console.log('🧪 Testing manual calculations with Climatiq API...');
  
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
  
  // 3. Test electricity calculation
  console.log('\n⚡ Testing electricity calculation...');
  try {
    const electricityResult = await ClimatiqEmissionService.calculateElectricityEmissions(1000, 'GB');
    console.log('✅ Electricity calculation successful:', electricityResult);
    
    // Save the calculation
    console.log('\n💾 Saving electricity calculation...');
    const saveResult = await ClimatiqEmissionService.saveEmissionData(electricityResult, companyId);
    console.log('✅ Save result:', saveResult);
    
    // Verify the calculation was saved
    console.log('\n🔍 Verifying saved data...');
    const { data: savedCalculations, error: fetchError } = await supabase
      .from('emission_calc_climatiq')
      .select('*')
      .eq('company_id', companyId)
      .eq('scope', Scope.SCOPE_2)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (fetchError) {
      console.error('❌ Error fetching saved calculation:', fetchError.message);
    } else if (savedCalculations && savedCalculations.length > 0) {
      console.log('✅ Found saved calculation:', savedCalculations[0]);
    } else {
      console.error('❌ No saved calculations found');
    }
  } catch (error) {
    console.error('❌ Error in electricity calculation:', error.message);
    console.log('Error details:', error);
  }
  
  // 4. Test transport calculation
  console.log('\n🚗 Testing transport calculation...');
  try {
    const transportResult = await ClimatiqEmissionService.calculateTransportEmissions(100, 'car', 'km');
    console.log('✅ Transport calculation successful:', transportResult);
    
    // Save the calculation
    console.log('\n💾 Saving transport calculation...');
    const saveResult = await ClimatiqEmissionService.saveEmissionData(transportResult, companyId);
    console.log('✅ Save result:', saveResult);
  } catch (error) {
    console.error('❌ Error in transport calculation:', error.message);
    console.log('Error details:', error);
  }
  
  // 5. Test fuel calculation
  console.log('\n⛽ Testing fuel calculation...');
  try {
    const fuelResult = await ClimatiqEmissionService.calculateFuelEmissions(50, 'diesel', 'L');
    console.log('✅ Fuel calculation successful:', fuelResult);
    
    // Save the calculation
    console.log('\n💾 Saving fuel calculation...');
    const saveResult = await ClimatiqEmissionService.saveEmissionData(fuelResult, companyId);
    console.log('✅ Save result:', saveResult);
  } catch (error) {
    console.error('❌ Error in fuel calculation:', error.message);
    console.log('Error details:', error);
  }
  
  console.log('\n✨ All tests complete!');
}

// Run the tests
testManualCalculations()
  .catch(err => {
    console.error('Tests failed with error:', err);
  }); 