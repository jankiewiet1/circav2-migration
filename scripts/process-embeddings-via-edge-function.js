import dotenv from 'dotenv'

dotenv.config()

const EDGE_FUNCTION_URL = `${process.env.VITE_SUPABASE_URL}/functions/v1/generate-embeddings`
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

async function callEdgeFunction(batchSize = 500) {
  try {
    console.log(`🚀 Calling Edge Function to process ${batchSize} records...`)
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize: batchSize
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('❌ Error calling Edge Function:', error)
    return { success: false, error: error.message }
  }
}

async function getProgress() {
  const { data, error } = await supabase
    .from('emission_factor_db')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  
  if (error) throw error
  return { remaining: data?.length || 0 }
}

async function processAllRecords() {
  console.log('🎯 Starting optimized batch processing via Edge Function...\n')
  console.log('📈 Using larger batches (500 records) with OpenAI batch API for maximum efficiency\n')
  
  let totalProcessed = 0
  let totalUpdated = 0
  let totalErrors = 0
  let batchNumber = 1
  const startTime = Date.now()
  
  while (true) {
    console.log(`📦 Processing batch ${batchNumber}...`)
    
    const batchStartTime = Date.now()
    const result = await callEdgeFunction(500) // Process 500 records at a time
    const batchDuration = (Date.now() - batchStartTime) / 1000
    
    if (!result.success) {
      console.error(`❌ Batch ${batchNumber} failed:`, result.error)
      
      // Try with smaller batch size on failure
      if (batchNumber === 1) {
        console.log('🔄 Retrying with smaller batch size (250 records)...')
        const retryResult = await callEdgeFunction(250)
        if (retryResult.success) {
          console.log(`   ✅ Retry successful with smaller batch`)
          totalProcessed += retryResult.processed
          totalUpdated += retryResult.updated
          totalErrors += retryResult.errors
        } else {
          console.error(`❌ Retry also failed, stopping...`)
          break
        }
      } else {
        break
      }
    } else {
      console.log(`   ✅ Batch ${batchNumber} complete in ${batchDuration.toFixed(1)}s:`)
      console.log(`      Processed: ${result.processed}`)
      console.log(`      Updated: ${result.updated}`)
      console.log(`      Errors: ${result.errors}`)
      console.log(`      Rate: ${Math.round(result.processed / batchDuration)} records/second`)
      
      totalProcessed += result.processed
      totalUpdated += result.updated
      totalErrors += result.errors
    }
    
    // If no records were processed, we're done
    if (result.processed === 0) {
      console.log(`\n🎉 All records processed!`)
      break
    }
    
    // Calculate progress and ETA
    const elapsedMinutes = (Date.now() - startTime) / 60000
    const recordsPerMinute = totalProcessed / elapsedMinutes
    const estimatedRemaining = Math.max(0, 45024 - totalProcessed)
    const etaMinutes = estimatedRemaining / recordsPerMinute
    
    console.log(`   📊 Progress: ${totalProcessed.toLocaleString()} processed, ~${Math.round(etaMinutes)} min remaining`)
    
    batchNumber++
    
    // Shorter delay between batches for faster processing on Pro plan
    console.log(`   ⏳ Waiting 0.5 seconds before next batch...\n`)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  const totalDuration = (Date.now() - startTime) / 60000
  
  console.log(`\n📊 Final Summary:`)
  console.log(`   Total batches: ${batchNumber - 1}`)
  console.log(`   Total processed: ${totalProcessed.toLocaleString()}`)
  console.log(`   Total updated: ${totalUpdated.toLocaleString()}`)
  console.log(`   Total errors: ${totalErrors}`)
  console.log(`   Success rate: ${totalProcessed > 0 ? ((totalUpdated/totalProcessed) * 100).toFixed(1) : 0}%`)
  console.log(`   Total time: ${totalDuration.toFixed(1)} minutes`)
  console.log(`   Average rate: ${Math.round(totalProcessed / totalDuration)} records/minute`)
  
  if (totalUpdated > 0) {
    console.log(`\n🎉 RAG system ready! You can now test the emissions calculator.`)
  }
}

processAllRecords().catch(console.error) 