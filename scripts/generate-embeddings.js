import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
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
      activityLower.includes('land use')) {
    return 'Scope 1';
  }
  
  // Scope 2: Indirect emissions from purchased energy
  if (activityLower.includes('electricity') || 
      activityLower.includes('heat') || 
      activityLower.includes('steam') ||
      activityLower.includes('2.') ||
      activityLower.includes('energy consumption') ||
      activityLower.includes('grid')) {
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
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function processRecords() {
  console.log('🚀 Starting embedding generation and scope classification...\n');
  
  // Get total count
  const { count } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Total records to process: ${count}\n`);
  
  const batchSize = 100;
  let processed = 0;
  let errors = 0;
  let updated = 0;
  
  for (let offset = 0; offset < count; offset += batchSize) {
    console.log(`📦 Processing batch ${Math.floor(offset/batchSize) + 1}/${Math.ceil(count/batchSize)} (records ${offset + 1}-${Math.min(offset + batchSize, count)})`);
    
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
    
    // Process each record in the batch
    for (const record of records) {
      try {
        // Create description for embedding
        const description = createDescription(record);
        
        // Generate embedding
        const embedding = await generateEmbedding(description);
        
        if (!embedding) {
          console.error(`❌ Failed to generate embedding for record ${record.id}`);
          errors++;
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
          console.error(`❌ Error updating record ${record.id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
        
        processed++;
        
        // Rate limiting - small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error processing record ${record.id}:`, error);
        errors++;
        processed++;
      }
    }
    
    console.log(`   ✅ Batch complete. Updated: ${updated}, Errors: ${errors}, Total processed: ${processed}`);
    
    // Longer delay between batches to respect rate limits
    if (offset + batchSize < count) {
      console.log('   ⏳ Waiting 2 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`   📊 Total processed: ${processed}`);
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📈 Success rate: ${((updated/processed) * 100).toFixed(1)}%`);
  
  if (updated > 0) {
    console.log(`\n🔍 Testing vector search...`);
    
    // Test the vector search
    const testQuery = "electricity consumption from coal power plant";
    const testEmbedding = await generateEmbedding(testQuery);
    
    if (testEmbedding) {
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'search_emission_factors',
        {
          query_embedding: testEmbedding,
          match_threshold: 0.5,
          match_count: 5
        }
      );
      
      if (searchError) {
        console.error('❌ Vector search test failed:', searchError);
      } else {
        console.log(`✅ Vector search test successful! Found ${searchResults.length} results for "${testQuery}"`);
        if (searchResults.length > 0) {
          console.log(`   Top result: ${searchResults[0].description} (similarity: ${searchResults[0].similarity.toFixed(3)})`);
        }
      }
    }
  }
  
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Test the RAG emissions calculator`);
  console.log(`   2. Verify scope classifications are correct`);
  console.log(`   3. Check embedding quality with various search queries`);
}

processRecords().catch(console.error); 