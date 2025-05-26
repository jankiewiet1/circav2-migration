// Test script to verify Climatiq API integration

import axios from 'axios';

// Climatiq API constants - same as in your application
const CLIMATIQ_API_URL = 'https://api.climatiq.io';
const CLIMATIQ_API_KEY = '2EJNHK4KN957591GX5J7Q6ZR9M';

// Create axios instance for Climatiq API
const climatiqClient = axios.create({
  baseURL: CLIMATIQ_API_URL,
  headers: {
    'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Test electricity emissions calculation
 */
async function testElectricityCalculation() {
  try {
    console.log('🔌 Testing electricity emissions calculation...');
    
    const params = {
      emission_factor: {
        activity_id: "electricity-supply_grid-source_residual_mix",
        data_version: "^21"
      },
      parameters: {
        energy: 1000, // 1000 kWh
        energy_unit: "kWh"
      }
    };
    
    const response = await climatiqClient.post('/data/v1/estimate', params);
    
    console.log('✅ API Response:', {
      co2e: response.data.co2e,
      co2e_unit: response.data.co2e_unit,
      source: response.data.emission_factor.source,
      category: response.data.emission_factor.category
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error calling Climatiq API:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test transport emissions calculation
 */
async function testTransportCalculation() {
  try {
    console.log('\n🚗 Testing transport emissions calculation...');
    
    const params = {
      emission_factor: {
        activity_id: "passenger_vehicle-vehicle_type_car-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na",
        data_version: "^21"
      },
      parameters: {
        distance: 100, // 100 km
        distance_unit: "km"
      }
    };
    
    const response = await climatiqClient.post('/data/v1/estimate', params);
    
    console.log('✅ API Response:', {
      co2e: response.data.co2e,
      co2e_unit: response.data.co2e_unit,
      source: response.data.emission_factor.source,
      category: response.data.emission_factor.category
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error calling Climatiq API:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test searching emission factors
 */
async function testSearchEmissionFactors() {
  try {
    console.log('\n🔍 Testing emission factor search...');
    
    const response = await climatiqClient.get('/emission-factors', {
      params: { query: 'electricity' }
    });
    
    console.log(`✅ Found ${response.data.results.length} emission factors`);
    console.log('📋 Sample factor:', response.data.results[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Error searching emission factors:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Testing Climatiq API integration...\n');
  
  let failures = 0;
  
  // Test 1: Electricity calculation
  if (!await testElectricityCalculation()) {
    failures++;
  }
  
  // Test 2: Transport calculation
  if (!await testTransportCalculation()) {
    failures++;
  }
  
  // Test 3: Emission factor search
  if (!await testSearchEmissionFactors()) {
    failures++;
  }
  
  console.log('\n✨ Test summary:');
  if (failures === 0) {
    console.log('🎉 All tests passed! The Climatiq API is working correctly.');
    console.log('👉 Your application is configured to use the Climatiq API for emission calculations.');
  } else {
    console.log(`❌ ${failures} test(s) failed. Please check the issues above.`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Unexpected error:', error);
}); 