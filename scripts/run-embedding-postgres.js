import pkg from 'pg';
import OpenAI from 'openai';

const { Client } = pkg;

// **SECURITY: Use environment variable instead of hardcoded key**
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  console.error('Please set it with: export OPENAI_API_KEY=your-api-key-here');
  process.exit(1);
}

// Database connection
const dbClient = new Client({
  connectionString: "postgresql://postgres:v.v.noordwijk@db.vfdbyvnjhimmnbyhxyun.supabase.co:5432/postgres"
});

// OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey
});

function classifyScope(activity) {
  const activityLower = activity.toLowerCase();
  
  // Scope 1: Direct emissions from owned or controlled sources
  if (activityLower.includes('fuel combustion') || 
      activityLower.includes('stationary') || 
      activityLower.includes('mobile') ||
      activityLower.includes('1.a') ||
      activityLower.includes('fugitive') ||
      activityLower.includes('process') ||
      activityLower.includes('agriculture') ||
      activityLower.includes('forestry') ||
      activityLower.includes('land use') ||
      activityLower.includes('diesel') ||
      activityLower.includes('petrol') ||
      activityLower.includes('gasoline') ||
      activityLower.includes('natural gas') ||
      activityLower.includes('lpg')) {
    return 'Scope 1';
  }
  
  // Scope 2: Indirect emissions from purchased energy
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') || 
      activityLower.includes('steam') ||
      activityLower.includes('2.') ||
      activityLower.includes('energy consumption') ||
      activityLower.includes('grid') ||
      activityLower.includes('power')) {
    return 'Scope 2';
  }
  
  // Scope 3: All other indirect emissions
  return 'Scope 3';
}

function createDescription(record) {
  const parts = [];
  
  if (record.Activity) parts.push(record.Activity);
  if (record.Fuel && record.Fuel.trim()) parts.push(`Fuel: ${record.Fuel}`);
  if (record.Country && record.Country.trim()) parts.push(`Country: ${record.Country}`);
  if (record.GHG && record.GHG.trim()) parts.push(`Gas: ${record.GHG}`);
  if (record.Unit) parts.push(`Unit: ${record.Unit}`);
  if (record.Source) parts.push(`Source: ${record.Source}`);
  
  return parts.join(' | ');
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error.message);
    return null;
  }
}

async function processRecords() {
  console.log('🚀 Starting embedding generation and scope classification...\n');
  
  // Connect to database
  await dbClient.connect();
  console.log('✅ Connected to database\n');
  
  // Get total count
  const countResult = await dbClient.query('SELECT COUNT(*) FROM emission_factor_db');
  const count = parseInt(countResult.rows[0].count);
  console.log(`📊 Total records to process: ${count}\n`);
  
  const batchSize = 1000;
  let processed = 0;
  let errors = 0;
  let updated = 0;
  let skipped = 0;
  
  for (let offset = 0; offset < count; offset += batchSize) {
    const batchNumber = Math.floor(offset/batchSize) + 1;
    const totalBatches = Math.ceil(count/batchSize);
    const endRecord = Math.min(offset + batchSize, count);
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (records ${offset + 1}-${endRecord})`);
    console.log(`   Progress: ${((offset/count) * 100).toFixed(1)}% complete`);
    
    // Fetch batch of records that need embeddings
    const fetchQuery = `
      SELECT * FROM emission_factor_db 
      WHERE embedding IS NULL OR description IS NULL OR scope IS NULL
      LIMIT $1 OFFSET $2
    `;
    
    const { rows: records } = await dbClient.query(fetchQuery, [batchSize, offset]);
    
    if (records.length === 0) {
      console.log(`   ⏩ No records need processing in this batch, skipping...`);
      processed += batchSize;
      skipped += batchSize;
      continue;
    }
    
    console.log(`   📝 Found ${records.length} records needing processing...`);
    
    // Process each record in the batch
    let batchUpdated = 0;
    let batchErrors = 0;
    let batchSkipped = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Create description for embedding
        const description = createDescription(record);
        
        // Generate embedding
        const embedding = await generateEmbedding(description);
        
        if (!embedding) {
          console.error(`   ❌ Failed to generate embedding for record ${record.id}`);
          errors++;
          batchErrors++;
          processed++;
          continue;
        }
        
        // Classify scope
        const scope = classifyScope(record.Activity);
        
        // Update record with embedding, description, and scope
        const updateQuery = `
          UPDATE emission_factor_db 
          SET 
            embedding = $1,
            description = $2,
            scope = $3,
            updated_at = NOW()
          WHERE id = $4
        `;
        
        await dbClient.query(updateQuery, [JSON.stringify(embedding), description, scope, record.id]);
        
        updated++;
        batchUpdated++;
        processed++;
        
        // Show progress every 100 records within batch
        if (i > 0 && i % 100 === 0) {
          console.log(`     🔄 Processed ${i}/${records.length} in this batch...`);
        }
        
        // Rate limiting - small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`   ❌ Error processing record ${record.id}:`, error.message);
        errors++;
        batchErrors++;
        processed++;
      }
    }
    
    console.log(`   ✅ Batch ${batchNumber} complete:`);
    console.log(`      📈 Updated: ${batchUpdated}, Skipped: ${batchSkipped}, Errors: ${batchErrors}`);
    console.log(`      📊 Total progress: ${processed}/${count} (${((processed/count) * 100).toFixed(1)}%)`);
    console.log(`      📈 Overall: Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
    
    // Longer delay between batches to respect rate limits
    if (offset + batchSize < count) {
      console.log(`   ⏳ Waiting 3 seconds before next batch...\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`   📊 Total processed: ${processed}`);
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ⏩ Skipped (already had embeddings): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📈 Success rate: ${(((updated + skipped)/processed) * 100).toFixed(1)}%`);
  
  if (updated > 0) {
    console.log(`\n🔍 Testing vector search...`);
    
    // Test the vector search
    const testQuery = "electricity consumption from coal power plant";
    const testEmbedding = await generateEmbedding(testQuery);
    
    if (testEmbedding) {
      const searchQuery = `
        SELECT 
          description,
          "EF_Value" as ef_value,
          "Unit" as unit,
          "Source" as source,
          1 - (embedding <=> $1) as similarity
        FROM emission_factor_db
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1
        LIMIT 5
      `;
      
      try {
        const { rows: searchResults } = await dbClient.query(searchQuery, [JSON.stringify(testEmbedding)]);
        
        console.log(`✅ Vector search test successful! Found ${searchResults.length} results for "${testQuery}"`);
        if (searchResults.length > 0) {
          console.log(`   🏆 Top result: ${searchResults[0].description} (similarity: ${searchResults[0].similarity.toFixed(3)})`);
          console.log(`   📋 Factor: ${searchResults[0].ef_value} ${searchResults[0].unit} (${searchResults[0].source})`);
        }
      } catch (searchError) {
        console.error('❌ Vector search test failed:', searchError.message);
      }
    }
  }
  
  await dbClient.end();
  console.log(`\n🎯 Database connection closed. Embedding generation complete!`);
  console.log(`   1. ✅ Test the RAG emissions calculator`);
  console.log(`   2. ✅ Verify scope classifications are correct`);
  console.log(`   3. ✅ Check embedding quality with various search queries`);
  console.log(`   4. ✅ Run emission calculations to see RAG working!`);
}

console.log('🔥 EMISSION FACTOR EMBEDDING GENERATOR (PostgreSQL Direct) 🔥');
console.log('=======================================================\n');

processRecords().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 