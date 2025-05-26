import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTextractDebug() {
  console.log('🔍 DEBUGGING TEXTRACT FAILURE')
  console.log('=============================')
  
  try {
    // Test with a simple, small PDF
    const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    
    console.log('📄 Testing with simple PDF:', testPdfUrl)
    console.log('🚀 Calling edge function with enhanced processing...')
    
    // Call the edge function and capture any error details
    const response = await fetch(`${supabaseUrl}/functions/v1/process-ai-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'extract_from_pdf',
        fileUrl: testPdfUrl,
        enhanced_processing: true
      })
    })
    
    const responseText = await response.text()
    console.log('📥 Raw response:', responseText)
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e)
      return
    }
    
    console.log('✅ Parsed response:')
    console.log('- Success:', data.success)
    console.log('- Message:', data.message)
    console.log('- Error:', data.error)
    
    if (data.data) {
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
      console.log('- Extraction method:', parsedData.metadata?.extractionMethod)
      console.log('- Warnings:', parsedData.warnings)
    }
    
    // Now let's check the Supabase dashboard logs
    console.log('\n🔗 Check the edge function logs in Supabase Dashboard:')
    console.log('https://supabase.com/dashboard/project/vfdbyvnjhimmnbyhxyun/functions')
    console.log('\nLook for the detailed error logs we just added!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testTextractDebug() 