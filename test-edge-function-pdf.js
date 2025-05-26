import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEdgeFunctionWithPDF() {
  console.log('🧪 Testing Edge Function with PDF Processing')
  console.log('==========================================')
  
  try {
    // First, let's upload a simple test PDF to Supabase storage
    console.log('1. Creating a simple test PDF...')
    
    // Create a minimal PDF content (this is a very basic PDF structure)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Content) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`

    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' })
    const testFile = new File([pdfBlob], 'test-document.pdf', { type: 'application/pdf' })
    
    console.log('2. Uploading test PDF to Supabase storage...')
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-uploads')
      .upload(`test-pdfs/test-${Date.now()}.pdf`, testFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload failed:', uploadError)
      return
    }
    
    console.log('✅ PDF uploaded successfully:', uploadData.path)
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('data-uploads')
      .getPublicUrl(uploadData.path)
    
    const fileUrl = urlData.publicUrl
    console.log('📄 PDF URL:', fileUrl)
    
    console.log('3. Calling edge function with enhanced processing...')
    
    const { data, error } = await supabase.functions.invoke('process-ai-data', {
      body: {
        operation: 'extract_from_pdf',
        fileUrl: fileUrl,
        enhanced_processing: true
      }
    })
    
    if (error) {
      console.error('❌ Edge function error:', error)
      return
    }
    
    console.log('✅ Edge function response:')
    console.log('Success:', data.success)
    console.log('Message:', data.message)
    
    if (data.data) {
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data
      console.log('Extraction method:', parsedData.metadata?.extractionMethod)
      console.log('Document type:', parsedData.document_type)
      console.log('Confidence:', parsedData.extraction_confidence)
      console.log('Entries found:', parsedData.entries?.length || 0)
      console.log('Warnings:', parsedData.warnings)
    }
    
    // Clean up - delete the test file
    console.log('4. Cleaning up test file...')
    await supabase.storage
      .from('data-uploads')
      .remove([uploadData.path])
    
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testEdgeFunctionWithPDF() 