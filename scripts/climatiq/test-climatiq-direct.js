// Simplified script to test Climatiq API directly
// Run with: node test-climatiq-direct.js YOUR_API_KEY_HERE

// Get API key from command line arguments
const apiKey = process.argv[2] || '';

if (!apiKey) {
  console.error('Please provide your Climatiq API key as argument');
  process.exit(1);
}

// Constants
const CLIMATIQ_SEARCH_URL = 'https://api.climatiq.io/search';
const CLIMATIQ_ESTIMATE_URL = 'https://api.climatiq.io/estimate';

// Test search API (for finding emission factors)
async function testSearch() {
  console.log('\n--- Testing Climatiq Search API ---');
  try {
    const searchBody = {
      query: 'electricity',
      data_version: '^21'
    };

    console.log('Search request:', JSON.stringify(searchBody));
    
    const response = await fetch(CLIMATIQ_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchBody)
    });
    
    console.log(`Search response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error response:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log(`Search success! Found ${data.results?.length || 0} results.`);
    
    if (data.results && data.results.length > 0) {
      const sample = data.results[0];
      console.log('Sample search result:');
      console.log('  ID:', sample.id);
      console.log('  Name:', sample.name);
      console.log('  Activity ID:', sample.activity_id);
      console.log('  Region:', sample.region);
      console.log('  Parameters:', JSON.stringify(sample.parameters).substring(0, 100) + '...');
      
      // Return the first result for estimate testing
      return sample;
    }
    
    return null;
  } catch (error) {
    console.error('Search API request failed:', error);
    return null;
  }
}

// Test estimate API (for calculating emissions)
async function testEstimate(emissionFactor) {
  console.log('\n--- Testing Climatiq Estimate API ---');
  
  if (!emissionFactor) {
    console.log('No emission factor available for testing estimate');
    return false;
  }
  
  try {
    // Find a parameter to use
    const param = emissionFactor.parameters[0];
    
    if (!param) {
      console.log('No parameters available in the emission factor');
      return false;
    }
    
    // Create test payload
    const payload = {
      emission_factor: {
        id: emissionFactor.id,
        data_version: '^21',
      },
      parameters: {
        [param.parameter]: 100, // Example value
        [`${param.parameter}_unit`]: param.unit
      }
    };
    
    console.log('Estimate request:', JSON.stringify(payload));
    
    const response = await fetch(CLIMATIQ_ESTIMATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Estimate response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Estimate error response:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('Estimate success! Result:');
    console.log('  CO2e:', data.co2e, data.co2e_unit);
    
    if (data.constituent_gases) {
      console.log('  CO2:', data.constituent_gases.co2);
      console.log('  CH4:', data.constituent_gases.ch4);
      console.log('  N2O:', data.constituent_gases.n2o);
    }
    
    return true;
  } catch (error) {
    console.error('Estimate API request failed:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting Climatiq API test');
  console.log(`Using API key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Test the search API
  const emissionFactor = await testSearch();
  
  // Test the estimate API
  const estimateSuccess = await testEstimate(emissionFactor);
  
  // Final result
  console.log('\n--- TEST RESULTS ---');
  console.log('Search API:', emissionFactor ? 'SUCCESS' : 'FAILED');
  console.log('Estimate API:', estimateSuccess ? 'SUCCESS' : 'FAILED');
  
  if (emissionFactor && estimateSuccess) {
    console.log('\n✅ All Climatiq API tests passed successfully!');
    return true;
  } else {
    console.log('\n❌ Some Climatiq API tests failed.');
    return false;
  }
}

// Run the main function
main()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 