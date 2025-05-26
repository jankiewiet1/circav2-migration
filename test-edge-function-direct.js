import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEdgeFunctionDirect() {
  console.log('🧪 Testing Edge Function with Direct PDF URL')
  console.log('============================================')
  
  try {
    // Use a publicly available PDF for testing
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    
    console.log('1. Testing with public PDF URL:', testPdfUrl)
    
    console.log('2. Calling edge function with enhanced processing enabled...')
    
    const { data, error } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: testPdfUrl,
        enhanced_processing: true
      }
    })
    
    if (error) {
      console.error('❌ Edge function error:', error)
      return
    }
    
    console.log('✅ Edge function response received!')
    console.log('Success:', data.success)
    console.log('Message:', data.message)
    
    if (data.data) {
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
      console.log('\n📊 Processing Details:')
      console.log('- Extraction method:', parsedData.metadata?.extractionMethod)
      console.log('- Document type:', parsedData.document_type)
      console.log('- Confidence:', parsedData.extraction_confidence)
      console.log('- Entries found:', parsedData.entries?.length || 0)
      console.log('- Warnings:', parsedData.warnings)
      
      if (parsedData.metadata?.extractionMethod === 'textract+gpt4') {
        console.log('🎉 SUCCESS: Textract is being used!')
      } else if (parsedData.metadata?.extractionMethod === 'gpt4-vision') {
        console.log('⚠️  WARNING: Falling back to GPT-4 Vision - Textract not working')
      } else {
        console.log('❓ UNKNOWN: Extraction method not clear')
      }
    }
    
    console.log('\n3. Now testing without enhanced processing (should use GPT-4 Vision)...')
    
    const { data: data2, error: error2 } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: testPdfUrl,
        enhanced_processing: false
      }
    })
    
    if (error2) {
      console.error('❌ Second test error:', error2)
      return
    }
    
    console.log('✅ Second test response received!')
    console.log('Success:', data2.success)
    console.log('Message:', data2.message)
    
    if (data2.data) {
      const parsedData2 = typeof data2.data === 'string' ? JSON.parse(data2.data) : data2.data
      console.log('- Extraction method:', parsedData2.metadata?.extractionMethod)
      console.log('- Should be "gpt4-vision":', parsedData2.metadata?.extractionMethod === 'gpt4-vision' ? '✅' : '❌')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testEdgeFunctionDirect() 