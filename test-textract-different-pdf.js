import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDifferentPDFs() {
  console.log('🧪 Testing Textract with Different PDF Types')
  console.log('===========================================')
  
  const testPDFs = [
    {
      name: 'Simple W3C PDF',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      name: 'Mozilla PDF.js Test',
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
    },
    {
      name: 'Adobe Sample PDF',
      url: 'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
    }
  ]
  
  for (const pdf of testPDFs) {
    console.log(`\n📄 Testing: ${pdf.name}`)
    console.log(`URL: ${pdf.url}`)
    
    try {
      const startTime = Date.now()
      
      const { data, error } = await supabase.functions.invoke('process-ai-data', {
        body: {
          operation: 'extract_from_pdf',
          fileUrl: pdf.url,
          enhanced_processing: true
        }
      })
      
      const endTime = Date.now()
      
      if (error) {
        console.error('❌ Error:', error)
        continue
      }
      
      console.log(`✅ Response in ${endTime - startTime}ms`)
      console.log('Success:', data.success)
      console.log('Message:', data.message)
      
      if (data.data) {
        const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
        console.log('🔧 Extraction method:', parsedData.metadata?.extractionMethod)
        console.log('📈 Confidence:', parsedData.extraction_confidence)
        console.log('⚠️  Warnings:', parsedData.warnings?.length || 0)
        
        if (parsedData.warnings && parsedData.warnings.length > 0) {
          console.log('Warning details:', parsedData.warnings)
        }
        
        if (parsedData.metadata?.extractionMethod === 'textract+gpt4') {
          console.log('🎉 SUCCESS: Textract worked for this PDF!')
          break // Found a working PDF, stop testing
        } else {
          console.log('⚠️  Textract failed, used GPT-4 Vision fallback')
        }
      }
      
    } catch (error) {
      console.error('❌ Test failed for', pdf.name, ':', error.message)
    }
  }
  
  console.log('\n📊 Check the Supabase logs for detailed error information:')
  console.log('https://supabase.com/dashboard/project/vfdbyvnjhimmnbyhxyun/functions/process-ai-data/logs')
}

testDifferentPDFs() 