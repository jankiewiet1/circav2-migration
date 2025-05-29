import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const inputFile = '/Users/band.nl/Desktop/EFs/output/all_emission_factors_cleaned_fixed.csv';

function classifyScope(activity) {
  const activityLower = activity.toLowerCase();
  
  if (activityLower.includes('fuel combustion') || 
      activityLower.includes('stationary') || 
      activityLower.includes('mobile') ||
      activityLower.includes('1.a')) {
    return 'Scope 1';
  }
  
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') || 
      activityLower.includes('steam') ||
      activityLower.includes('2.')) {
    return 'Scope 2';
  }
  
  return 'Scope 3';
}

function createDescription(row) {
  const parts = [];
  
  if (row.Activity) parts.push(row.Activity);
  if (row.Fuel && row.Fuel.trim()) parts.push(`Fuel: ${row.Fuel}`);
  if (row.Country && row.Country.trim()) parts.push(`Country: ${row.Country}`);
  if (row.GHG && row.GHG.trim()) parts.push(`Gas: ${row.GHG}`);
  
  return parts.join(' | ');
}

async function loadCSVData() {
  console.log('📊 Starting CSV import to Supabase...\n');
  
  const rows = [];
  let totalRows = 0;
  
  // Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(inputFile)
      .pipe(csv())
      .on('data', (row) => {
        totalRows++;
        
        const record = {
          id: uuidv4(),
          Activity: row.Activity,
          Fuel: row.Fuel || null,
          Country: row.Country || null,
          GHG: row.GHG || null,
          EF_Value: row.EF_Value, // Keep as string since table column is TEXT
          Unit: row.Unit,
          Source: row.Source,
          description: createDescription(row),
          scope: classifyScope(row.Activity),
          embedding: null, // Will be generated later
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        rows.push(record);
        
        if (totalRows % 1000 === 0) {
          console.log(`Read ${totalRows} rows...`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`\n📋 Read ${rows.length} records from CSV`);
  console.log('🚀 Starting batch upload to Supabase...\n');
  
  // Upload in batches of 1000
  const batchSize = 1000;
  let uploaded = 0;
  let errors = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('emission_factor_db')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errors += batch.length;
      } else {
        uploaded += batch.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Uploaded ${batch.length} records (Total: ${uploaded})`);
      }
    } catch (err) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, err.message);
      errors += batch.length;
    }
  }
  
  console.log(`\n🎉 Import complete!`);
  console.log(`   Successfully uploaded: ${uploaded} records`);
  console.log(`   Errors: ${errors} records`);
  console.log(`   Total processed: ${rows.length} records`);
  
  if (uploaded > 0) {
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Run the embedding generation script to enable semantic search`);
    console.log(`   2. Test the RAG emissions calculator`);
  }
}

loadCSVData().catch(console.error); 