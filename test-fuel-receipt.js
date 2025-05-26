import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFuelReceipt() {
  console.log('⛽ Testing Fuel Receipt Processing')
  console.log('=================================')
  
  try {
    // Test with the fuel receipt - we'll need to upload it first or use a URL
    // For now, let's test with a similar document structure
    
    console.log('📄 Testing fuel receipt processing...')
    console.log('🚀 This should extract:')
    console.log('   - Fuel type: Euro 95 Ongelood / E10')
    console.log('   - Multiple purchase dates')
    console.log('   - Volume in liters')
    console.log('   - Supplier: ABS')
    console.log('   - Total cost: €272.48')
    
    // Since we can't directly test the uploaded file, let's create a test
    // that simulates what should happen with fuel data
    
    console.log('\n🔍 Expected extraction for fuel receipts:')
    console.log('Each fuel purchase should become a Scope 1 emission entry:')
    
    const expectedEntries = [
      {
        date: '2025-04-05',
        activity_description: 'Fuel purchase - Euro 95 Ongelood / E10',
        quantity: 13.60, // Example from the receipt
        unit: 'liters',
        ghg_category: 'Scope 1',
        supplier_vendor: 'ABS',
        cost: 25.13,
        currency: 'EUR',
        notes: 'Gasoline purchase for vehicle',
        confidence: 0.9
      }
    ]
    
    console.log('\nExample expected entry:')
    console.log(JSON.stringify(expectedEntries[0], null, 2))
    
    // Test with a simple PDF to see current extraction
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    
    const { data, error } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: testPdfUrl,
        enhanced_processing: true
      }
    })
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('\n📊 Current extraction result:')
    console.log('Success:', data.success)
    console.log('Message:', data.message)
    
    if (data.data) {
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
      console.log('🔧 Extraction method:', parsedData.metadata?.extractionMethod)
      console.log('📈 Confidence:', parsedData.extraction_confidence)
      console.log('📝 Entries found:', parsedData.entries?.length || 0)
      
      if (parsedData.entries && parsedData.entries.length > 0) {
        console.log('Extracted entries:', parsedData.entries)
      } else {
        console.log('❌ No entries extracted - this is the issue!')
      }
    }
    
    console.log('\n🔧 To fix fuel receipt extraction:')
    console.log('1. The GPT-4 prompt needs to better recognize fuel purchases')
    console.log('2. Should look for keywords: "Euro 95", "E10", "liters", "fuel"')
    console.log('3. Should classify fuel purchases as Scope 1 emissions')
    console.log('4. Should extract volume data from tables')
    
    console.log('\n📋 Next steps:')
    console.log('1. Upload your ABS fuel receipt through the UI')
    console.log('2. Check the Supabase logs to see what text Textract extracted')
    console.log('3. Improve the GPT-4 prompt to better handle fuel receipts')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testFuelReceipt() 