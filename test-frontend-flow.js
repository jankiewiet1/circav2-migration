import { createClient } from '@supabase/supabase-js'
import { EnhancedAIDataProcessingService } from './src/services/enhancedAIDataProcessingService.js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFrontendFlow() {
  console.log('🧪 Testing Complete Frontend Flow')
  console.log('=================================')
  
  try {
    // Step 1: Create Enhanced Service (like frontend does)
    console.log('1. Creating Enhanced AI Data Processing Service...')
    const enhancedService = new EnhancedAIDataProcessingService()
    
    // Step 2: Get processing info (like frontend does)
    const processingInfo = enhancedService.getProcessingInfo()
    console.log('2. Processing Info:')
    console.log('   - Method:', processingInfo.method)
    console.log('   - Available:', processingInfo.available)
    console.log('   - Description:', processingInfo.description)
    
    // Step 3: Simulate file upload to storage (like DataEntryService.uploadFileToStorage)
    console.log('3. Simulating file upload to storage...')
    
    // Create a test PDF with some carbon accounting content
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
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(ENERGY BILL - January 2024) Tj
0 -20 Td
(Electricity consumption: 1250 kWh) Tj
0 -20 Td
(Natural gas: 85 m3) Tj
0 -20 Td
(Total cost: EUR 245.50) Tj
0 -20 Td
(Supplier: Green Energy Corp) Tj
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
450
%%EOF`

    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' })
    const testFile = new File([pdfBlob], 'energy-bill-test.pdf', { type: 'application/pdf' })
    
    // Upload to storage (using service role key for permissions)
    const serviceRoleClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data: uploadData, error: uploadError } = await serviceRoleClient.storage
      .from('data-uploads')
      .upload(`test-frontend/energy-bill-${Date.now()}.pdf`, testFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError)
      return
    }
    
    console.log('✅ File uploaded to:', uploadData.path)
    
    // Get public URL
    const { data: urlData } = serviceRoleClient.storage
      .from('data-uploads')
      .getPublicUrl(uploadData.path)
    
    const fileUrl = urlData.publicUrl
    console.log('📄 File URL:', fileUrl)
    
    // Step 4: Call enhanced service (exactly like frontend does)
    console.log('4. Calling enhanced service extractFromPDF...')
    
    const extractionResult = await enhancedService.extractFromPDF(fileUrl)
    
    console.log('✅ Enhanced service response:')
    console.log('   - Success:', extractionResult.success)
    console.log('   - Message:', extractionResult.message)
    console.log('   - Confidence:', extractionResult.confidence_score)
    console.log('   - Entries found:', extractionResult.extracted_data?.length || 0)
    console.log('   - Requires review:', extractionResult.requires_user_review)
    
    if (extractionResult.extracted_data && extractionResult.extracted_data.length > 0) {
      console.log('📊 Sample extracted entry:')
      console.log(JSON.stringify(extractionResult.extracted_data[0], null, 2))
    }
    
    // Step 5: Clean up
    console.log('5. Cleaning up test file...')
    await serviceRoleClient.storage
      .from('data-uploads')
      .remove([uploadData.path])
    
    console.log('✅ Frontend flow test completed!')
    
    // Summary
    if (extractionResult.success) {
      console.log('\n🎉 RESULT: Frontend is correctly using Textract!')
      console.log('The integration is working end-to-end.')
    } else {
      console.log('\n❌ ISSUE: Frontend flow failed')
      console.log('There may be an issue with the enhanced service.')
    }
    
  } catch (error) {
    console.error('❌ Frontend flow test failed:', error)
  }
}

testFrontendFlow() 