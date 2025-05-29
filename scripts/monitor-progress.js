import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function monitorProgress() {
  const { count: totalCount } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddings } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: withScope } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true })
    .not('scope', 'is', null);

  const progress = Math.round((withEmbeddings/totalCount)*100);
  const remaining = totalCount - withEmbeddings;
  const estimatedBatches = Math.ceil(remaining / 250); // Updated for 250 records per batch
  const estimatedMinutes = Math.ceil(estimatedBatches * 0.1); // ~6 seconds per batch (much faster!)

  console.clear();
  console.log('🚀 OPTIMIZED RAG Embedding Generation Progress');
  console.log('==============================================');
  console.log(`📊 Total records: ${totalCount.toLocaleString()}`);
  console.log(`✅ With embeddings: ${withEmbeddings.toLocaleString()} (${progress}%)`);
  console.log(`🎯 With scope: ${withScope.toLocaleString()}`);
  console.log(`⏳ Remaining: ${remaining.toLocaleString()}`);
  console.log(`📦 Estimated batches left: ${estimatedBatches}`);
  console.log(`⚡ Batch size: 250 records (5x faster!)`);
  console.log(`⏰ Estimated time remaining: ~${estimatedMinutes} minutes`);
  
  // Progress bar
  const barLength = 50;
  const filledLength = Math.round((progress / 100) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`\n[${bar}] ${progress}%`);
  
  // Performance stats
  if (withEmbeddings > 0) {
    const recordsPerMinute = 250 / 0.1; // 250 records per 6 seconds = ~2500 records/minute
    console.log(`\n📈 Performance:`);
    console.log(`   Rate: ~${recordsPerMinute.toLocaleString()} records/minute`);
    console.log(`   Using OpenAI batch API for efficiency`);
    console.log(`   Processing 250 records per batch`);
  }
  
  if (progress === 100) {
    console.log('\n🎉 All records processed! RAG emissions calculator is ready!');
    console.log('🔍 You can now test semantic search with natural language queries');
    return true;
  }
  
  console.log(`\nLast updated: ${new Date().toLocaleTimeString()}`);
  console.log('Press Ctrl+C to stop monitoring');
  return false;
}

async function startMonitoring() {
  console.log('🚀 Starting optimized progress monitoring...\n');
  
  while (true) {
    const isComplete = await monitorProgress();
    if (isComplete) break;
    
    // Update every 15 seconds (faster updates for faster processing)
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

startMonitoring().catch(console.error); 