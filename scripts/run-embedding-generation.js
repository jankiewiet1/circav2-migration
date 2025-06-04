import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Direct environment variables (since .env might not be loading)
const supabaseUrl = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  console.error('Please set it with: export OPENAI_API_KEY=your-api-key-here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

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
  
  // Use known count from database check
  const count = 45024;
  console.log(`📊 Total records to process: ${count}\n`);
  
  const batchSize = 1000; // Increased batch size as requested
  let processed = 0;
  let errors = 0;
  let updated = 0;
  let skipped = 0;
  
  if (count === 0) {
    console.log('⚠️  No records found in emission_factor_db table');
    return;
  }
  
  for (let offset = 0; offset < count; offset += batchSize) {
    const batchNumber = Math.floor(offset/batchSize) + 1;
    const totalBatches = Math.ceil(count/batchSize);
    const endRecord = Math.min(offset + batchSize, count);
    
    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (records ${offset + 1}-${endRecord})`);
    console.log(`   Progress: ${((offset/count) * 100).toFixed(1)}% complete`);
    
    // Fetch batch of records
    const { data: records, error: fetchError } = await supabase
      .from('emission_factor_db')
      .select('*')
      .range(offset, offset + batchSize - 1);
    
    if (fetchError) {
      console.error('❌ Error fetching records:', fetchError);
      errors += batchSize;
      continue;
    }
    
    console.log(`   📝 Fetched ${records.length} records, processing embeddings...`);
    
    // Process each record in the batch
    let batchUpdated = 0;
    let batchErrors = 0;
    let batchSkipped = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Skip if already has embedding
        if (record.embedding && record.embedding.length > 0) {
          skipped++;
          batchSkipped++;
          processed++;
          continue;
        }
        
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
        const { error: updateError } = await supabase
          .from('emission_factor_db')
          .update({
            embedding: embedding,
            description: description,
            scope: scope,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);
        
        if (updateError) {
          console.error(`   ❌ Error updating record ${record.id}:`, updateError);
          errors++;
          batchErrors++;
        } else {
          updated++;
          batchUpdated++;
        }
        
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
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'find_similar_emission_factors',
        {
          query_embedding: testEmbedding,
          similarity_threshold: 0.5,
          max_results: 5
        }
      );
      
      if (searchError) {
        console.error('❌ Vector search test failed:', searchError);
      } else {
        console.log(`✅ Vector search test successful! Found ${searchResults.length} results for "${testQuery}"`);
        if (searchResults.length > 0) {
          console.log(`   🏆 Top result: ${searchResults[0].description} (similarity: ${searchResults[0].similarity.toFixed(3)})`);
          console.log(`   📋 Factor: ${searchResults[0].ef_value} ${searchResults[0].unit} (${searchResults[0].source})`);
        }
      }
    }
  }
  
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. ✅ Test the RAG emissions calculator`);
  console.log(`   2. ✅ Verify scope classifications are correct`);
  console.log(`   3. ✅ Check embedding quality with various search queries`);
  console.log(`   4. ✅ Run emission calculations to see RAG working!`);
}

console.log('🔥 EMISSION FACTOR EMBEDDING GENERATOR 🔥');
console.log('=========================================\n');

processRecords().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 