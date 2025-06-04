// Script to process all emission factor embeddings using Supabase edge function
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";

const BATCH_SIZE = 1000; // As requested
const TOTAL_RECORDS = 45024; // Known from previous check
const DELAY_BETWEEN_BATCHES = 3000; // 3 seconds between batches

async function callGenerateEmbeddings(batchSize) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ batchSize })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function processAllEmbeddings() {
  console.log('🔥 EMISSION FACTOR EMBEDDING GENERATOR (Supabase Edge Function) 🔥');
  console.log('================================================================\n');
  console.log('🚀 Starting embedding generation for all records...\n');
  console.log(`📊 Total estimated records: ${TOTAL_RECORDS}`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let batchNumber = 0;
  let estimatedBatches = Math.ceil(TOTAL_RECORDS / BATCH_SIZE);

  const startTime = Date.now();

  while (true) {
    batchNumber++;
    
    console.log(`📦 Processing batch ${batchNumber}/${estimatedBatches}`);
    console.log(`   Progress: ${((totalProcessed / TOTAL_RECORDS) * 100).toFixed(1)}% complete`);
    console.log(`   Processed so far: ${totalProcessed}/${TOTAL_RECORDS}`);

    try {
      const result = await callGenerateEmbeddings(BATCH_SIZE);
      
      if (!result.success) {
        console.error(`   ❌ Batch failed:`, result.error || 'Unknown error');
        totalErrors += BATCH_SIZE;
        break;
      }

      const { processed, updated, errors, message } = result;
      
      totalProcessed += processed;
      totalUpdated += updated;
      totalErrors += errors;

      console.log(`   ✅ Batch ${batchNumber} complete:`);
      console.log(`      📈 This batch: Updated ${updated}, Errors ${errors} (Processed ${processed})`);
      console.log(`      📊 Total progress: ${totalProcessed} records, ${totalUpdated} updated, ${totalErrors} errors`);
      console.log(`      📈 Success rate: ${(((totalUpdated) / totalProcessed) * 100).toFixed(1)}%`);

      // If no records were processed, we're done
      if (processed === 0) {
        console.log(`\n🎉 All records processed! No more records need embeddings.`);
        break;
      }

      // Update estimated batches based on actual progress
      estimatedBatches = Math.ceil(totalProcessed / BATCH_SIZE) + Math.ceil((TOTAL_RECORDS - totalProcessed) / BATCH_SIZE);

      // Calculate ETA
      const elapsed = Date.now() - startTime;
      const rate = totalProcessed / elapsed; // records per ms
      const remaining = TOTAL_RECORDS - totalProcessed;
      const etaMs = remaining / rate;
      const etaMinutes = Math.round(etaMs / 60000);

      console.log(`      ⏱️  Estimated time remaining: ${etaMinutes} minutes`);
      console.log(`      ⚡ Processing rate: ${(rate * 1000 * 60).toFixed(0)} records/minute`);

      // Wait before next batch
      if (processed > 0) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }

    } catch (error) {
      console.error(`   ❌ Error in batch ${batchNumber}:`, error.message);
      totalErrors += BATCH_SIZE;
      
      // Wait a bit longer on error
      console.log(`   ⏳ Waiting 10 seconds before retrying...\n`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  const totalTime = Date.now() - startTime;
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);

  console.log(`\n🎉 Embedding generation complete!`);
  console.log(`   📊 Total processed: ${totalProcessed}`);
  console.log(`   ✅ Successfully updated: ${totalUpdated}`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log(`   📈 Final success rate: ${(((totalUpdated) / totalProcessed) * 100).toFixed(1)}%`);
  console.log(`   ⏱️  Total processing time: ${minutes}m ${seconds}s`);
  console.log(`   ⚡ Average rate: ${((totalProcessed / totalTime) * 1000 * 60).toFixed(0)} records/minute`);

  if (totalUpdated > 0) {
    console.log(`\n🔍 Testing vector search...`);
    
    // Test the vector search by calling the RAG function
    try {
      const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          raw_input: "Office electricity consumption: 1000 kWh",
          company_id: "test-company",
          demo_mode: true
        })
      });

      if (testResponse.ok) {
        const testResult = await testResponse.json();
        if (testResult.calculation_result && testResult.calculation_result.total_emissions) {
          console.log(`   ✅ RAG search test successful!`);
          console.log(`   🏆 Found match: ${testResult.calculation_result.emission_factor_info?.description || 'N/A'}`);
          console.log(`   📋 Calculated: ${testResult.calculation_result.total_emissions} kg CO2e`);
          console.log(`   🎯 Confidence: ${(testResult.calculation_result.confidence * 100).toFixed(1)}%`);
        } else {
          console.log(`   ⚠️  RAG search test completed but no match found (this is normal)`);
        }
      } else {
        console.log(`   ❌ RAG search test failed: ${testResponse.status}`);
      }
    } catch (error) {
      console.log(`   ❌ RAG search test error: ${error.message}`);
    }
  }

  console.log(`\n🎯 Next steps:`);
  console.log(`   1. ✅ Test the RAG emissions calculator with real data`);
  console.log(`   2. ✅ Verify calculation accuracy and sources`);
  console.log(`   3. ✅ Check Data Traceability page functionality`);
  console.log(`   4. ✅ Confirm proper scope classifications`);
}

// Run the script
processAllEmbeddings().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 