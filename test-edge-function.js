import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEdgeFunction() {
  console.log('🧪 Testing Edge Function with AWS Textract Integration...')
  
  try {
    // Test with a PDF extraction request
    const { data, error } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        enhanced_processing: true
      }
    })

    if (error) {
      console.error('❌ Edge function error:', error)
      return false
    }

    console.log('✅ Edge function response:', data)
    return true

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Edge Function Test...')
  
  const success = await testEdgeFunction()
  
  if (success) {
    console.log('\n✅ Edge function test completed successfully!')
    console.log('🎉 AWS Textract integration is ready to use!')
  } else {
    console.log('\n❌ Edge function test failed')
    console.log('💡 Check the Supabase dashboard for function logs')
  }
}

main().catch(console.error) 