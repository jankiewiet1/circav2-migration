const fs = require('fs');
const csv = require('csv-parser');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CSV_FILE_PATH = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned.csv';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

function determineScope(activity) {
  const activityLower = activity.toLowerCase();
  
  // Scope 1: Direct emissions
  if (activityLower.includes('fuel combustion') || 
      activityLower.includes('stationary') || 
      activityLower.includes('mobile') ||
      activityLower.includes('fugitive')) {
    return 'Scope 1';
  }
  
  // Scope 2: Indirect emissions from electricity
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') ||
      activityLower.includes('steam')) {
    return 'Scope 2';
  }
  
  // Scope 3: Other indirect emissions
  if (activityLower.includes('transport') || 
      activityLower.includes('waste') ||
      activityLower.includes('business travel') ||
      activityLower.includes('supply chain')) {
    return 'Scope 3';
  }
  
  return null; // Unknown scope
}

async function loadTestData() {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    const maxRecords = 10; // Only load 10 records for testing
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      reject(new Error(`CSV file not found: ${CSV_FILE_PATH}`));
      return;
    }

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => {
        if (count >= maxRecords) return;
        
        // Clean and transform the data
        const cleanedData = {
          source: data.Source || 'Unknown',
          category_1: data.Activity || '',
          category_2: data.Fuel || '',
          category_3: data.Country || '',
          category_4: data.GHG || '',
          subcategory: data.Fuel || '',
          fuel_type: data.Fuel || '',
          description: `${data.Activity || ''} - ${data.Fuel || ''} (${data.Country || 'Global'})`.trim(),
          unit: data.Unit || '',
          ghg_unit: 'kg CO2e',
          co2_factor: data.GHG === 'CO2' ? parseFloat(data.EF_Value || 0) || null : null,
          ch4_factor: data.GHG === 'CH4' ? parseFloat(data.EF_Value || 0) || null : null,
          n2o_factor: data.GHG === 'N2O' ? parseFloat(data.EF_Value || 0) || null : null,
          total_factor: parseFloat(data.EF_Value || 0) || 0,
          year_published: new Date().getFullYear(),
          region: data.Country || 'Global',
          scope: determineScope(data.Activity || ''),
          activity_type: data.Activity || ''
        };

        // Only include rows with valid data
        if (cleanedData.description && cleanedData.unit && cleanedData.total_factor > 0) {
          results.push(cleanedData);
          count++;
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${results.length} test emission factors from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
}

async function testSupabaseFunction(data) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/load-emission-factors`;
  
  console.log(`🧪 Testing with ${data.length} emission factors...`);

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        csv_data: data,
        batch_size: 5 // Small batch for testing
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Test successful:', result);
    return result;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🧪 Starting test load of emission factors...\n');
    
    // Load test data
    const testData = await loadTestData();
    
    if (testData.length === 0) {
      console.log('⚠️ No valid test data found');
      return;
    }

    // Show sample data
    console.log('\n📋 Sample test data:');
    console.log(JSON.stringify(testData[0], null, 2));
    
    // Test the Supabase function
    const result = await testSupabaseFunction(testData);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('Ready to load the full dataset with the main script.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { loadTestData, testSupabaseFunction }; 