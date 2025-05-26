// Simple script to test Climatiq API directly
// Run with: node test-climatiq-api.js YOUR_API_KEY_HERE

const apiKey = process.argv[2] || '';

if (!apiKey) {
  console.error('Please provide your Climatiq API key as argument');
  process.exit(1);
}

console.log(`Testing Climatiq API with key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);

async function testClimatiqApi() {
  try {
    const response = await fetch('https://api.climatiq.io/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'electricity',
        data_version: '^21'
      })
    });

    console.log(`API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log(`Success! Found ${data.results?.length || 0} results.`);
    
    if (data.results && data.results.length > 0) {
      console.log('Sample result:');
      console.log('  ID:', data.results[0].id);
      console.log('  Name:', data.results[0].name);
      console.log('  Activity ID:', data.results[0].activity_id);
    }
    
    return true;
  } catch (error) {
    console.error('API request failed:', error);
    return false;
  }
}

testClimatiqApi()
  .then(success => {
    if (success) {
      console.log('Climatiq API test completed successfully!');
      process.exit(0);
    } else {
      console.error('Climatiq API test failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Test threw an exception:', err);
    process.exit(1);
  }); 