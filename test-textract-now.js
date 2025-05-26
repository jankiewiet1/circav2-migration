import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTextractNow() {
  console.log('🔥 TESTING TEXTRACT RIGHT NOW')
  console.log('============================')
  console.log('Time:', new Date().toISOString())
  
  try {
    // Use a PDF with actual content that should trigger Textract
    const testPdfUrl = 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
    
    console.log('📄 Testing with Adobe sample PDF:', testPdfUrl)
    console.log('🚀 Calling edge function with enhanced processing...')
    
    const startTime = Date.now()
    
    const { data, error } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: testPdfUrl,
        enhanced_processing: true
      }
    })
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`✅ Response received in ${processingTime}ms`)
    console.log('Success:', data.success)
    console.log('Message:', data.message)
    
    if (data.data) {
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
      
      console.log('\n📊 PROCESSING RESULTS:')
      console.log('======================')
      console.log('🔧 Extraction method:', parsedData.metadata?.extractionMethod)
      console.log('📋 Document type:', parsedData.document_type)
      console.log('📈 Confidence:', parsedData.extraction_confidence)
      console.log('📝 Entries found:', parsedData.entries?.length || 0)
      console.log('⚠️  Warnings:', parsedData.warnings?.length || 0)
      
      if (parsedData.warnings && parsedData.warnings.length > 0) {
        console.log('Warning details:', parsedData.warnings)
      }
      
      console.log('\n🎯 TEXTRACT STATUS:')
      if (parsedData.metadata?.extractionMethod === 'textract+gpt4') {
        console.log('✅ TEXTRACT IS WORKING!')
        console.log('✅ AWS Textract was successfully called')
        console.log('✅ Integration is functioning correctly')
      } else if (parsedData.metadata?.extractionMethod === 'gpt4-vision') {
        console.log('⚠️  TEXTRACT FAILED - Using GPT-4 Vision fallback')
        console.log('❌ Check AWS credentials or Textract service')
      } else {
        console.log('❓ Unknown extraction method')
      }
    }
    
    console.log('\n⏰ Check AWS CloudWatch now for Textract metrics!')
    console.log('🔗 https://eu-central-1.console.aws.amazon.com/cloudwatch/home?region=eu-central-1#metricsV2:namespace=AWS/Textract')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testTextractNow() 