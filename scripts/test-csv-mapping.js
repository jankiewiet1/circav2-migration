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

const CSV_FILE_PATH = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned.csv';

function classifyScope(activity, fuel) {
  const activity_lower = activity?.toLowerCase() || '';
  const fuel_lower = fuel?.toLowerCase() || '';
  
  if (activity_lower.includes('combustion') || 
      activity_lower.includes('fuel') ||
      fuel_lower.includes('natural gas') ||
      fuel_lower.includes('diesel') ||
      fuel_lower.includes('petrol') ||
      fuel_lower.includes('gasoline') ||
      fuel_lower.includes('coal')) {
    return 'Scope 1';
  }
  
  if (activity_lower.includes('electricity') ||
      activity_lower.includes('grid') ||
      activity_lower.includes('power')) {
    return 'Scope 2';
  }
  
  return 'Scope 3';
}

function cleanAndValidateRow(row) {
  if (!row.Activity || !row.EF_Value || !row.Unit || !row.Source) {
    return null;
  }
  
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

function mapToDbRecord(row) {
  const description = createDescription(row);
  const scope = classifyScope(row.activity, row.fuel);
  
  const dbRecord = {
    source: row.source,
    category_1: row.activity,
    category_2: null,
    category_3: null,
    category_4: null,
    subcategory: null,
    fuel_type: row.fuel,
    description: description,
    unit: row.unit,
    ghg_unit: 'kg CO2e',
    region: row.country,
    scope: scope,
    activity_type: row.activity,
    year_published: null,
    embedding: null // Will be generated later
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
    dbRecord.co2_factor = null;
    dbRecord.ch4_factor = null;
    dbRecord.n2o_factor = null;
    dbRecord.total_factor = row.ef_value;
  }
  
  return dbRecord;
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

async function testCsvMapping() {
  console.log('🧪 Testing CSV mapping with first 3 rows...\n');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_FILE_PATH}`);
    return;
  }
  
  const rows = [];
  let count = 0;
  
  // Read only first 3 valid rows
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csv())
      .on('data', (row) => {
        if (count < 3) {
          const cleanedRow = cleanAndValidateRow(row);
          if (cleanedRow) {
            rows.push(cleanedRow);
            count++;
          }
        }
        if (count >= 3) {
          resolve();
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 Found ${rows.length} valid test rows\n`);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`🔍 Row ${i + 1}:`);
    console.log(`   CSV: ${row.activity} | ${row.fuel} | ${row.country} | ${row.ghg} | ${row.ef_value} | ${row.unit} | ${row.source}`);
    
    const dbRecord = mapToDbRecord(row);
    console.log(`   Mapped description: "${dbRecord.description}"`);
    console.log(`   Scope: ${dbRecord.scope}`);
    console.log(`   Factors: CO2=${dbRecord.co2_factor}, CH4=${dbRecord.ch4_factor}, N2O=${dbRecord.n2o_factor}, Total=${dbRecord.total_factor}`);
    
    // Generate embedding
    console.log(`   🔤 Generating embedding...`);
    const embedding = await generateEmbedding(dbRecord.description);
    
    if (embedding) {
      dbRecord.embedding = embedding;
      console.log(`   ✅ Embedding generated (${embedding.length} dimensions)`);
      
      // Try to insert
      console.log(`   💾 Testing database insert...`);
      const { data, error } = await supabase
        .from('emission_factor_db')
        .insert(dbRecord)
        .select();
      
      if (error) {
        console.error(`   ❌ Insert failed:`, error.message);
      } else {
        console.log(`   ✅ Insert successful! ID: ${data[0].id}`);
        
        // Clean up - delete the test record
        await supabase
          .from('emission_factor_db')
          .delete()
          .eq('id', data[0].id);
        console.log(`   🧹 Test record cleaned up`);
      }
    } else {
      console.log(`   ❌ Embedding generation failed`);
    }
    
    console.log('');
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎉 Test complete!');
}

testCsvMapping().catch(console.error); 