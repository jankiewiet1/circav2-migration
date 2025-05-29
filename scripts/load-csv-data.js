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
const BATCH_SIZE = 20; // Smaller batches for better control
const EMBEDDING_DELAY = 200; // Longer delay to avoid rate limits

// CSV columns: Activity,Fuel,Country,GHG,EF_Value,Unit,Source
// DB columns: source, category_1, category_2, category_3, category_4, subcategory, 
//            fuel_type, description, unit, ghg_unit, co2_factor, ch4_factor, 
//            n2o_factor, total_factor, year_published, region, scope, 
//            activity_type, embedding

function classifyScope(activity, fuel) {
  const activity_lower = activity?.toLowerCase() || '';
  const fuel_lower = fuel?.toLowerCase() || '';
  
  // Scope 1: Direct emissions from owned/controlled sources
  if (activity_lower.includes('combustion') || 
      activity_lower.includes('fuel') ||
      fuel_lower.includes('natural gas') ||
      fuel_lower.includes('diesel') ||
      fuel_lower.includes('petrol') ||
      fuel_lower.includes('gasoline') ||
      fuel_lower.includes('coal')) {
    return 'Scope 1';
  }
  
  // Scope 2: Electricity
  if (activity_lower.includes('electricity') ||
      activity_lower.includes('grid') ||
      activity_lower.includes('power')) {
    return 'Scope 2';
  }
  
  // Scope 3: Everything else
  return 'Scope 3';
}

function cleanAndValidateRow(row) {
  // Check required fields
  if (!row.Activity || !row.EF_Value || !row.Unit || !row.Source) {
    return null;
  }
  
  // Skip corrupted data
  if (row.GHG && (row.GHG.includes('°') || row.GHG.includes('.'))) {
    return null;
  }
  
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
    country: row.Country?.trim() || 'Global',
    ghg: row.GHG?.trim() || 'CO2e',
    ef_value: efValue,
    unit: row.Unit.trim(),
    source: row.Source.trim()
  };
}

function createDescription(row) {
  let parts = [row.activity];
  if (row.fuel) parts.push(row.fuel);
  if (row.country && row.country !== 'Global') parts.push(row.country);
  return parts.join(' - ');
}

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

function mapToDbRecord(row) {
  const description = createDescription(row);
  const scope = classifyScope(row.activity, row.fuel);
  
  // Map CSV columns to DB columns
  const dbRecord = {
    source: row.source,                    // Source -> source
    category_1: row.activity,              // Activity -> category_1
    category_2: null,                      // Not in CSV
    category_3: null,                      // Not in CSV
    category_4: null,                      // Not in CSV
    subcategory: null,                     // Not in CSV
    fuel_type: row.fuel,                   // Fuel -> fuel_type
    description: description,              // Generated from Activity + Fuel + Country
    unit: row.unit,                        // Unit -> unit
    ghg_unit: 'kg CO2e',                  // Standardized
    region: row.country,                   // Country -> region
    scope: scope,                          // Classified from activity
    activity_type: row.activity,           // Activity -> activity_type
    year_published: null,                  // Not in CSV
    embedding: null                        // Will be generated
  };
  
  // Handle gas-specific factors
  if (row.ghg === 'CO2' || row.ghg === 'CO2_bio') {
    dbRecord.co2_factor = row.ef_value;
    dbRecord.ch4_factor = null;
    dbRecord.n2o_factor = null;
    dbRecord.total_factor = row.ef_value;
  } else if (row.ghg === 'CH4' || row.ghg === 'CH4_bio') {
    dbRecord.co2_factor = null;
    dbRecord.ch4_factor = row.ef_value;
    dbRecord.n2o_factor = null;
    dbRecord.total_factor = row.ef_value;
  } else if (row.ghg === 'N2O') {
    dbRecord.co2_factor = null;
    dbRecord.ch4_factor = null;
    dbRecord.n2o_factor = row.ef_value;
    dbRecord.total_factor = row.ef_value;
  } else {
    // CO2e or other total factors
    dbRecord.co2_factor = null;
    dbRecord.ch4_factor = null;
    dbRecord.n2o_factor = null;
    dbRecord.total_factor = row.ef_value;
  }
  
  return dbRecord;
}

async function loadCsvData() {
  console.log('🚀 Starting CSV data loading process...\n');
  
  // Check file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
    return;
  }
  
  console.log(`📁 Reading CSV: ${CSV_FILE_PATH}`);
  
  // Read and parse CSV
  const rows = [];
  let totalRows = 0;
  let validRows = 0;
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        const cleanedRow = cleanAndValidateRow(row);
        if (cleanedRow) {
          rows.push(cleanedRow);
          validRows++;
        }
        
        // Show progress every 1000 rows
        if (totalRows % 1000 === 0) {
          console.log(`📊 Processed ${totalRows} rows...`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\n📊 CSV parsing complete:`);
  console.log(`   Total rows: ${totalRows}`);
  console.log(`   Valid rows: ${validRows}`);
  console.log(`   Skipped: ${totalRows - validRows}`);
  
  if (validRows === 0) {
    console.error('❌ No valid rows found');
    return;
  }
  
  // Process in batches
  console.log(`\n🔄 Processing ${validRows} rows in batches of ${BATCH_SIZE}...`);
  
  let processed = 0;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} items)`);
    
    const batchData = [];
    
    for (const row of batch) {
      const dbRecord = mapToDbRecord(row);
      
      // Generate embedding
      console.log(`🔤 Embedding: ${dbRecord.description.substring(0, 40)}...`);
      const embedding = await generateEmbedding(dbRecord.description);
      
      if (embedding) {
        dbRecord.embedding = embedding;
        batchData.push(dbRecord);
      } else {
        console.log(`⚠️ Skipping row due to embedding failure`);
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
        console.error(`❌ Insert error:`, error.message);
        errors += batchData.length;
      } else {
        inserted += batchData.length;
        console.log(`✅ Inserted ${batchData.length} records`);
      }
    }
    
    processed += batch.length;
    const progress = Math.round((processed / rows.length) * 100);
    console.log(`📈 Progress: ${processed}/${rows.length} (${progress}%)`);
  }
  
  console.log(`\n🎉 Loading complete!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Errors: ${errors}`);
  
  // Final count
  const { count } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total records in database: ${count}`);
}

// Run the process
loadCsvData().catch(console.error); 