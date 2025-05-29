const fs = require('fs');
const path = require('path');
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
    ghg_unit: ghg === 'CO2e' ? unit : 'kg CO2e', // Use original unit for CO2e, standardize others
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

async function loadCSVData() {
  return new Promise((resolve, reject) => {
    const results = [];
    let totalRows = 0;
    let skippedRows = 0;
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      reject(new Error(`CSV file not found: ${CSV_FILE_PATH}`));
      return;
    }

    console.log('📊 Loading and cleaning CSV data...');

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => {
        totalRows++;
        
        const cleanedData = cleanAndValidateData(data);
        
        if (cleanedData) {
          results.push(cleanedData);
        } else {
          skippedRows++;
        }

        // Progress indicator
        if (totalRows % 5000 === 0) {
          console.log(`   Processed ${totalRows} rows, kept ${results.length}, skipped ${skippedRows}`);
        }
      })
      .on('end', () => {
        console.log(`✅ CSV processing complete:`);
        console.log(`   Total rows processed: ${totalRows}`);
        console.log(`   Valid emission factors: ${results.length}`);
        console.log(`   Skipped invalid rows: ${skippedRows}`);
        console.log(`   Success rate: ${((results.length / totalRows) * 100).toFixed(1)}%`);
        resolve(results);
      })
      .on('error', reject);
  });
}

async function sendToSupabase(data, batchSize = 100) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/load-emission-factors`;
  
  console.log(`🚀 Sending ${data.length} emission factors to Supabase in batches of ${batchSize}...`);
  
  // Split data into batches
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  let totalProcessed = 0;
  let totalErrors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} items)...`);

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          csv_data: batch,
          batch_size: 25 // Smaller batch size for embeddings to avoid rate limits
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Batch ${i + 1} complete:`, {
        processed: result.processed,
        errors: result.errors,
        success_rate: result.success_rate
      });

      totalProcessed += result.processed;
      totalErrors += result.errors;

      // Longer delay between batches for large dataset
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`❌ Error processing batch ${i + 1}:`, error.message);
      totalErrors += batch.length;
    }
  }

  console.log('\n🎉 Loading complete!');
  console.log(`📊 Summary:`);
  console.log(`   Total items: ${data.length}`);
  console.log(`   Processed: ${totalProcessed}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Success rate: ${((totalProcessed / data.length) * 100).toFixed(1)}%`);
}

async function main() {
  try {
    console.log('🚀 Starting emission factors loading process...\n');
    
    // Load CSV data
    const csvData = await loadCSVData();
    
    if (csvData.length === 0) {
      console.log('⚠️ No valid data found in CSV file');
      return;
    }

    // Show sample data
    console.log('\n📋 Sample cleaned data:');
    console.log(JSON.stringify(csvData[0], null, 2));
    
    // Show data statistics
    const sources = [...new Set(csvData.map(d => d.source))];
    const scopes = [...new Set(csvData.map(d => d.scope).filter(Boolean))];
    const ghgTypes = [...new Set(csvData.map(d => d.category_4).filter(Boolean))];
    
    console.log('\n📈 Dataset Statistics:');
    console.log(`   Sources: ${sources.join(', ')}`);
    console.log(`   Scopes: ${scopes.join(', ')}`);
    console.log(`   GHG Types: ${ghgTypes.join(', ')}`);
    
    console.log(`\n❓ Ready to load ${csvData.length} emission factors?`);
    console.log('   This will generate embeddings and may take 30-60 minutes...');
    console.log('   Press Ctrl+C to cancel, or wait 10 seconds to continue...');
    
    // 10 second delay to allow cancellation
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await sendToSupabase(csvData);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { loadCSVData, sendToSupabase }; 