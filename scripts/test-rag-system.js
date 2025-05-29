import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function getValidCompanyId() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()
  
  if (error) {
    console.log('❌ Error fetching company:', error.message)
    return null
  }
  
  console.log(`📋 Using company: ${data.name} (${data.id})`)
  return data.id
}

async function testRagSystem() {
  console.log('🧪 Testing RAG Emissions Calculator System...\n')
  
  // Get a valid company ID
  const companyId = await getValidCompanyId()
  if (!companyId) {
    console.log('❌ No valid company found. Please create a company first.')
    return
  }
  
  console.log('') // Empty line for readability
  
  const testInputs = [
    "I need to know the factor for fuel usage EURO 95, 100 liters in the Netherlands based on DEFRA",
    "50 liters of petrol EURO 95 in Netherlands",
    "Natural gas consumption 1000 m3 for heating",
    "Electricity consumption 500 kWh office building",
    "Diesel fuel 75 liters for company vehicles"
  ]
  
  for (const input of testInputs) {
    console.log(`🔍 Testing: "${input}"`)
    
    try {
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/rag-emissions-calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: input,
          company_id: companyId
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`❌ Error: ${response.status} - ${errorText}\n`)
        continue
      }
      
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Success!`)
        console.log(`   Method: RAG`)
        console.log(`   Matched Factor: ${result.matched_factor.description}`)
        console.log(`   Source: ${result.matched_factor.source}`)
        console.log(`   Similarity: ${(result.matched_factor.similarity * 100).toFixed(1)}%`)
        console.log(`   Calculation: ${result.calculation.quantity} ${result.calculation.unit} × ${result.calculation.emission_factor} ${result.calculation.emission_factor_unit} = ${result.calculation.total_emissions.toFixed(2)} ${result.calculation.emissions_unit}`)
        console.log(`   Confidence: ${(result.calculation.confidence * 100).toFixed(1)}%`)
        console.log(`   Processing Time: ${result.processing_time_ms}ms`)
        
        if (result.alternative_matches && result.alternative_matches.length > 0) {
          console.log(`   Alternative matches: ${result.alternative_matches.length}`)
        }
      } else {
        console.log(`❌ Failed: ${result.error}`)
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`)
    }
    
    console.log('') // Empty line for readability
  }
  
  console.log('🎯 RAG System Test Complete!')
}

testRagSystem().catch(console.error) 