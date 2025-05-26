// Live test for Climatiq API calculations

import axios from 'axios';

// Climatiq API constants
const CLIMATIQ_API_URL = 'https://api.climatiq.io';
const CLIMATIQ_API_KEY = '2EJNHK4KN957591GX5J7Q6ZR9M';

// Sample data to test with - using valid working activity IDs from Climatiq documentation
const TEST_SAMPLES = [
  {
    name: "Office Electricity (1000 kWh, Netherlands)",
    params: {
      emission_factor: {
        activity_id: "electricity-supply_grid-source_residual_mix",
        data_version: "^21",
        region: "NL" // Netherlands
      },
      parameters: {
        energy: 1000,
        energy_unit: "kWh"
      }
    }
  },
  {
    name: "Office Electricity (1000 kWh, United Kingdom)",
    params: {
      emission_factor: {
        activity_id: "electricity-supply_grid-source_residual_mix",
        data_version: "^21",
        region: "GB" // Great Britain
      },
      parameters: {
        energy: 1000,
        energy_unit: "kWh"
      }
    }
  },
  {
    name: "Office Equipment Purchase (€1000, Germany)",
    params: {
      emission_factor: {
        activity_id: "office_equipment-type_office_machinery_computers",
        data_version: "^21",
        region: "DE" // Germany
      },
      parameters: {
        money: 1000,
        money_unit: "eur"
      }
    }
  },
  {
    name: "Office Equipment Purchase (€1000, France)",
    params: {
      emission_factor: {
        activity_id: "office_equipment-type_office_machinery_computers",
        data_version: "^21",
        region: "FR" // France
      },
      parameters: {
        money: 1000,
        money_unit: "eur"
      }
    }
  }
];

// Create axios instance for Climatiq API
const climatiqClient = axios.create({
  baseURL: CLIMATIQ_API_URL,
  headers: {
    'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'gzip'
  }
});

/**
 * Calculate emissions using Climatiq API
 */
async function calculateEmissions(params, name) {
  console.log(`\n🧮 Calculating emissions for: ${name}`);
  console.log(`Parameters: ${JSON.stringify(params.parameters)}`);
  console.log(`Activity: ${params.emission_factor.activity_id}`);
  
  try {
    const response = await climatiqClient.post('/data/v1/estimate', params);
    
    // Print key information from the response
    console.log(`✅ Result: ${response.data.co2e} ${response.data.co2e_unit}`);
    console.log(`📊 Source: ${response.data.emission_factor.source}`);
    console.log(`🔍 Category: ${response.data.emission_factor.category}`);
    console.log(`🌍 Region: ${response.data.emission_factor.region || 'Global'}`);
    
    // More detailed breakdown if available
    if (response.data.constituent_gases) {
      console.log('💨 Constituent gases:');
      for (const [gas, value] of Object.entries(response.data.constituent_gases)) {
        if (value !== null) {
          console.log(`   - ${gas}: ${value}`);
        }
      }
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ Error: ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.error(`Details: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

/**
 * Run all test calculations
 */
async function runTestCalculations() {
  console.log('🧪 CLIMATIQ API LIVE CALCULATION TEST');
  console.log('====================================');
  
  const results = [];
  
  // Run each test calculation
  for (const test of TEST_SAMPLES) {
    const result = await calculateEmissions(test.params, test.name);
    if (result) {
      results.push({
        name: test.name,
        emissions: result.co2e,
        unit: result.co2e_unit
      });
    }
  }
  
  // Print summary
  console.log('\n📝 SUMMARY');
  console.log('====================================');
  
  if (results.length === 0) {
    console.log('❌ All calculations failed');
  } else {
    console.log(`✅ Successfully calculated ${results.length} out of ${TEST_SAMPLES.length} samples`);
    
    // Print table of results
    console.log('\n| Activity | Emissions | Unit |');
    console.log('|----------|-----------|------|');
    for (const result of results) {
      console.log(`| ${result.name} | ${result.emissions} | ${result.unit} |`);
    }
  }
}

// Run the tests
runTestCalculations().catch(err => {
  console.error('❌ Unexpected error:', err);
}); 