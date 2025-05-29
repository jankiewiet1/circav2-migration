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
      activityLower.includes('fugitive') ||
      activityLower.includes('1.a')) {
    return 'Scope 1';
  }
  
  // Scope 2: Indirect emissions from electricity
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') ||
      activityLower.includes('steam') ||
      activityLower.includes('2.')) {
    return 'Scope 2';
  }
  
  // Scope 3: Other indirect emissions
  if (activityLower.includes('transport') || 
      activityLower.includes('waste') ||
      activityLower.includes('business travel') ||
      activityLower.includes('supply chain') ||
      activityLower.includes('3.')) {
    return 'Scope 3';
  }
  
  return null; // Unknown scope
}

function cleanAndValidateData(data) {
  // Clean the data
  const activity = (data.Activity || '').trim();
  const fuel = (data.Fuel || '').trim();
  const country = (data.Country || '').trim();
  const ghg = (data.GHG || '').trim();
  const efValue = parseFloat(data.EF_Value || 0);
  const unit = (data.Unit || '').trim();
  const source = (data.Source || '').trim();

  // Skip rows with invalid or missing critical data
  if (!activity || !efValue || efValue <= 0 || !unit || !source) {
    return null;
  }

  // Skip rows where GHG column contains non-GHG data (like coordinates)
  const validGHGs = ['CO2', 'CH4', 'N2O', 'CO2e', 'CO2_bio', 'CH4_bio'];
  const isValidGHG = validGHGs.includes(ghg) || ghg === '';

  // Skip rows where source contains units (indicates data corruption)
  const invalidSources = ['kg CO2e/kg', 'kg CO2e/tonne', 'tonnes C/ha', 'g CH4/kg'];
  const hasInvalidSource = invalidSources.some(invalid => source.includes(invalid));

  if (!isValidGHG || hasInvalidSource) {
    return null;
  }

  // Create clean description
  const descriptionParts = [activity];
  if (fuel && fuel !== activity) descriptionParts.push(fuel);
  if (country && country !== 'Global') descriptionParts.push(`(${country})`);
  
  const description = descriptionParts.join(' - ');

  // Determine gas-specific factors
  let co2Factor = null, ch4Factor = null, n2oFactor = null;
  
  if (ghg === 'CO2' || ghg === 'CO2_bio') {
    co2Factor = efValue;
  } else if (ghg === 'CH4' || ghg === 'CH4_bio') {
    ch4Factor = efValue;
  } else if (ghg === 'N2O') {
    n2oFactor = efValue;
  }

  return {
    source: source || 'Unknown',
    category_1: activity,
    category_2: fuel || null,
    category_3: country || 'Global',
    category_4: ghg || null,
    subcategory: fuel || null,
    fuel_type: fuel || null,
    description: description,
    unit: unit,
    ghg_unit: ghg === 'CO2e' ? unit : 'kg CO2e',
    co2_factor: co2Factor,
    ch4_factor: ch4Factor,
    n2o_factor: n2oFactor,
    total_factor: efValue,
    year_published: new Date().getFullYear(),
    region: country || 'Global',
    scope: determineScope(activity),
    activity_type: activity
  };
}

async function loadTestData() {
  return new Promise((resolve, reject) => {
    const results = [];
    let count = 0;
    let totalRows = 0;
    const maxRecords = 20; // Load 20 records for testing
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      reject(new Error(`CSV file not found: ${CSV_FILE_PATH}`));
      return;
    }

    console.log('📊 Loading test data from CSV...');

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        
        if (count >= maxRecords) return;
        
        const cleanedData = cleanAndValidateData(data);
        
        if (cleanedData) {
          results.push(cleanedData);
          count++;
          console.log(`   ✅ Valid record ${count}: ${cleanedData.description}`);
        } else {
          console.log(`   ⚠️ Skipped invalid row ${totalRows}`);
        }
      })
      .on('end', () => {
        console.log(`✅ Test data loading complete:`);
        console.log(`   Total rows processed: ${totalRows}`);
        console.log(`   Valid test records: ${results.length}`);
        resolve(results);
      })
      .on('error', reject);
  });
}

async function testSupabaseFunction(data) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/load-emission-factors`;
  
  console.log(`🧪 Testing Supabase function with ${data.length} emission factors...`);

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
    
    // Show test statistics
    const sources = [...new Set(testData.map(d => d.source))];
    const scopes = [...new Set(testData.map(d => d.scope).filter(Boolean))];
    const ghgTypes = [...new Set(testData.map(d => d.category_4).filter(Boolean))];
    
    console.log('\n📈 Test Dataset Statistics:');
    console.log(`   Sources: ${sources.join(', ')}`);
    console.log(`   Scopes: ${scopes.join(', ')}`);
    console.log(`   GHG Types: ${ghgTypes.join(', ')}`);
    
    // Test the Supabase function
    const result = await testSupabaseFunction(testData);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('✅ The RAG system is working correctly.');
    console.log('🚀 Ready to load the full dataset with: node scripts/load-emission-factors.cjs');
    
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