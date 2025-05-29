import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const CSV_FILE_PATH = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned.csv';
const BATCH_SIZE = 50; // Process in batches to avoid rate limits
const EMBEDDING_DELAY = 100; // ms delay between embedding requests

// Scope classification based on activity type
function classifyScope(activity, fuel) {
  const activity_lower = activity?.toLowerCase() || '';
  const fuel_lower = fuel?.toLowerCase() || '';
  
  // Scope 1: Direct emissions
  if (activity_lower.includes('combustion') || 
      activity_lower.includes('fuel') ||
      activity_lower.includes('gas') ||
      activity_lower.includes('diesel') ||
      activity_lower.includes('petrol') ||
      fuel_lower.includes('natural gas') ||
      fuel_lower.includes('diesel') ||
      fuel_lower.includes('petrol') ||
      fuel_lower.includes('gasoline')) {
    return 'Scope 1';
  }
  
  // Scope 2: Electricity
  if (activity_lower.includes('electricity') ||
      activity_lower.includes('grid') ||
      activity_lower.includes('power')) {
    return 'Scope 2';
  }
  
  // Scope 3: Everything else (transport, materials, etc.)
  return 'Scope 3';
}

// Clean and validate data
function cleanRow(row) {
  // Skip rows with invalid data
  if (!row.Activity || !row.EF_Value || !row.Unit || !row.Source) {
    return null;
  }
  
  // Skip rows where coordinates appear in GHG column (data corruption)
  if (row.GHG && (row.GHG.includes('°') || row.GHG.includes('.'))) {
    return null;
  }
  
  // Skip rows where units appear in source column
  if (row.Source && (row.Source.includes('kg') || row.Source.includes('tonne'))) {
    return null;
  }
  
  const efValue = parseFloat(row.EF_Value);
  if (isNaN(efValue) || efValue <= 0) {
    return null;
  }
  
  return {
    activity: row.Activity.trim(),
    fuel: row.Fuel?.trim() || null,
    country: row.Country?.trim() || null,
    ghg: row.GHG?.trim() || 'CO2e',
    ef_value: efValue,
    unit: row.Unit.trim(),
    source: row.Source.trim()
  };
}

// Create searchable description
function createDescription(row) {
  let parts = [row.activity];
  
  if (row.fuel) parts.push(row.fuel);
  if (row.country && row.country !== 'Global') parts.push(row.country);
  
  return parts.join(' - ');
}

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}

// Process CSV and load data
async function loadEmissionFactors() {
  console.log('🚀 Starting emission factors data loading...\n');
  
  // Check if file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
    return;
  }
  
  console.log(`📁 Reading CSV file: ${CSV_FILE_PATH}`);
  
  const rows = [];
  let totalRows = 0;
  let validRows = 0;
  let skippedRows = 0;
  
  // Read and parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        const cleanedRow = cleanRow(row);
        
        if (cleanedRow) {
          rows.push(cleanedRow);
          validRows++;
        } else {
          skippedRows++;
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 CSV parsing complete:`);
  console.log(`   Total rows: ${totalRows}`);
  console.log(`   Valid rows: ${validRows}`);
  console.log(`   Skipped rows: ${skippedRows}`);
  
  if (validRows === 0) {
    console.error('❌ No valid rows found in CSV');
    return;
  }
  
  // Group by gas type for proper factor assignment
  const gasSpecificFactors = new Map();
  const aggregatedFactors = new Map();
  
  for (const row of rows) {
    const key = `${row.activity}|${row.fuel || ''}|${row.country || 'Global'}|${row.source}`;
    
    if (row.ghg === 'CO2e' || row.ghg === 'CO2_eq') {
      // This is a total factor
      if (!aggregatedFactors.has(key)) {
        aggregatedFactors.set(key, {
          ...row,
          total_factor: row.ef_value,
          co2_factor: null,
          ch4_factor: null,
          n2o_factor: null
        });
      }
    } else {
      // This is a gas-specific factor
      if (!gasSpecificFactors.has(key)) {
        gasSpecificFactors.set(key, {
          ...row,
          total_factor: 0,
          co2_factor: null,
          ch4_factor: null,
          n2o_factor: null
        });
      }
      
      const factor = gasSpecificFactors.get(key);
      if (row.ghg === 'CO2' || row.ghg === 'CO2_bio') {
        factor.co2_factor = row.ef_value;
      } else if (row.ghg === 'CH4' || row.ghg === 'CH4_bio') {
        factor.ch4_factor = row.ef_value;
      } else if (row.ghg === 'N2O') {
        factor.n2o_factor = row.ef_value;
      }
    }
  }
  
  // Calculate total factors for gas-specific entries
  for (const [key, factor] of gasSpecificFactors) {
    factor.total_factor = (factor.co2_factor || 0) + 
                         (factor.ch4_factor || 0) + 
                         (factor.n2o_factor || 0);
  }
  
  // Combine all factors
  const allFactors = [...aggregatedFactors.values(), ...gasSpecificFactors.values()];
  
  console.log(`\n🔄 Processing ${allFactors.length} unique emission factors...`);
  
  // Process in batches
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < allFactors.length; i += BATCH_SIZE) {
    const batch = allFactors.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allFactors.length / BATCH_SIZE)} (${batch.length} items)`);
    
    const batchData = [];
    
    for (const factor of batch) {
      const description = createDescription(factor);
      const scope = classifyScope(factor.activity, factor.fuel);
      
      // Generate embedding
      console.log(`🔤 Generating embedding for: ${description.substring(0, 50)}...`);
      const embedding = await generateEmbedding(description);
      
      if (embedding) {
        batchData.push({
          source: factor.source,
          category_1: factor.activity,
          fuel_type: factor.fuel,
          description: description,
          unit: factor.unit,
          ghg_unit: 'kg CO2e',
          co2_factor: factor.co2_factor,
          ch4_factor: factor.ch4_factor,
          n2o_factor: factor.n2o_factor,
          total_factor: factor.total_factor,
          region: factor.country || 'Global',
          scope: scope,
          activity_type: factor.activity,
          embedding: embedding
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, EMBEDDING_DELAY));
    }
    
    // Insert batch
    if (batchData.length > 0) {
      console.log(`💾 Inserting ${batchData.length} records...`);
      const { data, error } = await supabase
        .from('emission_factor_db')
        .insert(batchData);
      
      if (error) {
        console.error(`❌ Batch insert error:`, error.message);
        errors += batchData.length;
      } else {
        inserted += batchData.length;
        console.log(`✅ Successfully inserted ${batchData.length} records`);
      }
    }
    
    processed += batch.length;
    console.log(`📈 Progress: ${processed}/${allFactors.length} (${Math.round(processed / allFactors.length * 100)}%)`);
  }
  
  console.log(`\n🎉 Data loading complete!`);
  console.log(`   Processed: ${processed} factors`);
  console.log(`   Inserted: ${inserted} records`);
  console.log(`   Errors: ${errors} records`);
  
  // Verify the data
  const { count } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Final database count: ${count} emission factors`);
}

// Run the loading process
loadEmissionFactors().catch(console.error); 