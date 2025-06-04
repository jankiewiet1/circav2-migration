import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

const BATCH_SIZE = 50;
const DELAY_MS = 100; // Delay between API calls to avoid rate limits

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixMissingEmbeddings() {
  console.log('🔍 Checking for records missing embeddings...');
  
  // Get records without embeddings
  const { data: recordsWithoutEmbeddings, error } = await supabase
    .from('emission_factor_db')
    .select('id, Activity, Fuel, Country, description')
    .is('embedding', null)
    .limit(1000); // Process in chunks

  if (error) {
    console.error('❌ Error fetching records:', error);
    return;
  }

  if (!recordsWithoutEmbeddings || recordsWithoutEmbeddings.length === 0) {
    console.log('✅ All records already have embeddings!');
    return;
  }

  console.log(`📊 Found ${recordsWithoutEmbeddings.length} records missing embeddings`);

  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < recordsWithoutEmbeddings.length; i += BATCH_SIZE) {
    const batch = recordsWithoutEmbeddings.slice(i, i + BATCH_SIZE);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recordsWithoutEmbeddings.length / BATCH_SIZE)} (${batch.length} records)`);
    
    for (const record of batch) {
      try {
        // Create embedding text from description
        const embeddingText = record.description || 
                             `${record.Activity} ${record.Fuel || ''} ${record.Country || ''}`.trim();
        
        console.log(`  🔄 Generating embedding for: ${embeddingText.substring(0, 50)}...`);
        
        const embedding = await generateEmbedding(embeddingText);
        
        if (embedding) {
          // Update the record with the embedding
          const { error: updateError } = await supabase
            .from('emission_factor_db')
            .update({ embedding })
            .eq('id', record.id);
          
          if (updateError) {
            console.error(`  ❌ Error updating record ${record.id}:`, updateError);
            failed++;
          } else {
            console.log(`  ✅ Updated record ${record.id}`);
            successful++;
          }
        } else {
          console.error(`  ❌ Failed to generate embedding for record ${record.id}`);
          failed++;
        }
        
        processed++;
        
        // Add delay to avoid rate limits
        await sleep(DELAY_MS);
        
      } catch (error) {
        console.error(`  ❌ Error processing record ${record.id}:`, error);
        failed++;
        processed++;
      }
    }
    
    console.log(`📈 Progress: ${processed}/${recordsWithoutEmbeddings.length} (${successful} successful, ${failed} failed)`);
    
    // Longer delay between batches
    if (i + BATCH_SIZE < recordsWithoutEmbeddings.length) {
      console.log('⏸️  Waiting between batches...');
      await sleep(1000);
    }
  }
  
  console.log('\n🎉 Embedding generation complete!');
  console.log(`📊 Final results:`);
  console.log(`   Total processed: ${processed}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  
  // Check final state
  const { data: finalCheck } = await supabase
    .from('emission_factor_db')
    .select('id')
    .is('embedding', null)
    .limit(1);
  
  if (finalCheck && finalCheck.length === 0) {
    console.log('✅ All records now have embeddings!');
  } else {
    console.log(`⚠️  There are still ${finalCheck ? 'some' : 'unknown number of'} records without embeddings`);
  }
}

// Run the script
fixMissingEmbeddings().catch(console.error); 