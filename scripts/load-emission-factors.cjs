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

async function loadCSVData() {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(CSV_FILE_PATH)) {
      reject(new Error(`CSV file not found: ${CSV_FILE_PATH}`));
      return;
    }

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (data) => {
        // Clean and transform the data based on actual CSV structure
        // CSV columns: Activity, Fuel, Country, GHG, EF_Value, Unit, Source
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
          ghg_unit: 'kg CO2e', // Standardize to kg CO2e
          co2_factor: data.GHG === 'CO2' ? parseFloat(data.EF_Value || 0) || null : null,
          ch4_factor: data.GHG === 'CH4' ? parseFloat(data.EF_Value || 0) || null : null,
          n2o_factor: data.GHG === 'N2O' ? parseFloat(data.EF_Value || 0) || null : null,
          total_factor: parseFloat(data.EF_Value || 0) || 0,
          year_published: new Date().getFullYear(), // Default to current year
          region: data.Country || 'Global',
          scope: determineScope(data.Activity || ''),
          activity_type: data.Activity || ''
        };

        // Only include rows with valid data
        if (cleanedData.description && cleanedData.unit && cleanedData.total_factor > 0) {
          results.push(cleanedData);
        }
      })
      .on('end', () => {
        console.log(`✅ Loaded ${results.length} emission factors from CSV`);
        resolve(results);
      })
      .on('error', reject);
  });
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
          batch_size: 50 // Internal batch size for embeddings
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

      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    console.log('\n📋 Sample data:');
    console.log(JSON.stringify(csvData[0], null, 2));
    
    // Confirm before proceeding
    console.log(`\n❓ Ready to load ${csvData.length} emission factors?`);
    console.log('   This will generate embeddings and may take several minutes...');
    
    // Auto-proceed for now (you can add readline for confirmation)
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