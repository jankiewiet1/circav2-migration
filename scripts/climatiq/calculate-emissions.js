// Standalone script to calculate emissions using Climatiq API
// Run with: node calculate-emissions.js YOUR_CLIMATIQ_API_KEY

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_ANON_KEY';
const CLIMATIQ_API_KEY = process.argv[2] || '';
const CLIMATIQ_SEARCH_URL = 'https://api.climatiq.io/search';
const CLIMATIQ_ESTIMATE_URL = 'https://api.climatiq.io/estimate';

// Validate input
if (!CLIMATIQ_API_KEY) {
  console.error('Please provide your Climatiq API key as argument');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to find the best emission factor from Climatiq
async function findBestEmissionFactor(category, description) {
  const query = [category, description].filter(Boolean).join(' ');
  console.log(`Searching Climatiq for: "${query}"`);
  
  try {
    const response = await fetch(CLIMATIQ_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        data_version: '^21'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Climatiq API error (${response.status}):`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} results from Climatiq`);
    
    if (!data.results || data.results.length === 0) return null;

    // Filter and prioritize results
    const prioritized = data.results
      .filter(ef => ef.parameters && ef.parameters.length > 0)
      .sort((a, b) => {
        // Prioritize by region, year, and source
        const regionScore = (ef) =>
          ef.region?.toLowerCase().includes('europe') ? 2 :
          ef.region?.toLowerCase().includes('global') ? 1 : 0;
        const yearScore = (ef) => Number(ef.year) || 0;
        const sourceScore = (ef) =>
          ef.source?.toLowerCase().includes('ghg protocol') ? 2 :
          ef.source?.toLowerCase().includes('epa') ? 1 : 0;
        return (
          regionScore(b) - regionScore(a) ||
          yearScore(b) - yearScore(a) ||
          sourceScore(b) - sourceScore(a)
        );
      });

    return prioritized[0] || data.results[0];
  } catch (error) {
    console.error('Error in findBestEmissionFactor:', error);
    return null;
  }
}

// Function to calculate emissions for a single entry
async function calculateEmissionsForEntry(entry) {
  console.log(`\n--- Processing entry ID ${entry.id}: ${entry.category} ---`);
  
  // Find best emission factor
  const ef = await findBestEmissionFactor(entry.category, entry.description);
  
  if (!ef) {
    console.log(`No emission factor found for entry ${entry.id}`);
    return {
      entry_id: entry.id,
      error: 'No emission factor found'
    };
  }
  
  console.log(`Found emission factor: ${ef.id} - ${ef.name}`);
  
  // Find matching parameter
  const param = ef.parameters.find(p =>
    entry.unit && p.unit?.toLowerCase() === entry.unit.toLowerCase()
  ) || ef.parameters[0];
  
  if (!param) {
    console.log(`No matching parameter found for unit: ${entry.unit}`);
    return {
      entry_id: entry.id,
      ef_id: ef.id,
      ef_description: ef.name,
      error: 'No matching parameter found'
    };
  }
  
  console.log(`Using parameter: ${param.parameter} (${param.unit})`);
  
  // Build request payload
  const payload = {
    emission_factor: {
      id: ef.id,
      data_version: '^21',
    },
    parameters: {
      [param.parameter]: entry.quantity,
      [`${param.parameter}_unit`]: param.unit
    }
  };
  
  // Call Climatiq estimate endpoint
  try {
    console.log('Calling Climatiq estimate endpoint...');
    const response = await fetch(CLIMATIQ_ESTIMATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Climatiq estimate error [${response.status}]:`, errorText);
      return {
        entry_id: entry.id,
        ef_id: ef.id,
        ef_description: ef.name,
        error: `Estimate failed: ${response.status}`
      };
    }
    
    const estimateData = await response.json();
    console.log('Estimate result:', JSON.stringify(estimateData).substring(0, 200) + '...');
    
    // Save result to database
    try {
      console.log('Saving calculation to database...');
      const { data, error } = await supabase
        .from('emission_calc_climatiq')
        .insert({
          company_id: entry.company_id,
          entry_id: entry.id,
          calculated_at: new Date().toISOString(),
          total_emissions: estimateData.co2e,
          emissions_unit: estimateData.co2e_unit,
          scope: entry.scope,
          climatiq_activity_id: ef.activity_id,
          climatiq_emissions_factor_id: ef.id,
          climatiq_factor_name: ef.name,
          climatiq_region: ef.region,
          climatiq_category: ef.category,
          climatiq_source: ef.source,
          climatiq_year: ef.year,
          co2_emissions: estimateData.constituent_gases?.co2,
          ch4_emissions: estimateData.constituent_gases?.ch4,
          n2o_emissions: estimateData.constituent_gases?.n2o,
          activity_data: estimateData.activity_data,
          request_params: payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('Database insert error:', error);
        return {
          entry_id: entry.id,
          ef_id: ef.id,
          ef_description: ef.name,
          co2e: estimateData.co2e,
          co2e_unit: estimateData.co2e_unit,
          error: `Database insert failed: ${error.message}`
        };
      } else {
        console.log('Calculation saved successfully');
        return {
          entry_id: entry.id,
          ef_id: ef.id,
          ef_description: ef.name,
          region: ef.region,
          source: ef.source,
          co2e: estimateData.co2e,
          co2e_unit: estimateData.co2e_unit,
          success: true
        };
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return {
        entry_id: entry.id,
        ef_id: ef.id,
        ef_description: ef.name,
        co2e: estimateData.co2e,
        co2e_unit: estimateData.co2e_unit,
        error: `Database exception: ${dbError.message}`
      };
    }
  } catch (apiError) {
    console.error('Climatiq API error:', apiError);
    return {
      entry_id: entry.id,
      ef_id: ef.id,
      ef_description: ef.name,
      error: `API error: ${apiError.message}`
    };
  }
}

// Main function to process emissions
async function processEmissions() {
  console.log('Starting emissions calculation process');
  console.log(`Using Climatiq API key: ${CLIMATIQ_API_KEY.substring(0, 4)}...${CLIMATIQ_API_KEY.substring(CLIMATIQ_API_KEY.length - 4)}`);
  
  try {
    // Fetch entries without calculations (limit to 5 for testing)
    const { data: entries, error: fetchError } = await supabase
      .from('emission_entries')
      .select('id, company_id, category, description, quantity, unit, scope')
      .order('id', { ascending: true })
      .limit(5);
    
    if (fetchError) {
      console.error('Error fetching entries:', fetchError.message);
      return;
    }
    
    if (!entries || entries.length === 0) {
      console.log('No emission entries found');
      return;
    }
    
    console.log(`Found ${entries.length} entries to process`);
    
    // Process each entry sequentially
    const results = [];
    for (const entry of entries) {
      const result = await calculateEmissionsForEntry(entry);
      results.push(result);
    }
    
    // Print summary
    console.log('\n--- RESULTS SUMMARY ---');
    console.log(`Total entries processed: ${results.length}`);
    console.log(`Successful calculations: ${results.filter(r => r.success).length}`);
    console.log(`Failed calculations: ${results.filter(r => r.error).length}`);
    
    // Print detailed results
    console.log('\nDetailed results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. Entry ID ${result.entry_id}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.success) {
        console.log(`   Emission factor: ${result.ef_description}`);
        console.log(`   CO2e: ${result.co2e} ${result.co2e_unit}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the main process
processEmissions()
  .then(() => {
    console.log('Process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  }); 