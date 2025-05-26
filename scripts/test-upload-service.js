import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase project credentials - copied from src/integrations/supabase/client.ts
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";

// Create the Supabase client
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
    },
    global: {
      headers: {
        'x-client-info': 'circav2',
      },
    },
  }
);

// Create a sample CSV file for testing
function createSampleCSV() {
  const csvContent = `date,activity,quantity,unit,scope
2023-01-01,Electricity consumption,1000,kWh,2
2023-02-01,Natural gas,500,m3,1
2023-03-01,Business travel,2000,km,3`;
  
  const filePath = path.join(process.cwd(), 'test_emissions_data.csv');
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Created sample CSV file at: ${filePath}`);
  return filePath;
}

// Test upload function
async function testUpload() {
  try {
    console.log('🧪 Testing file upload functionality...\n');
    
    // Step 1: Check authentication status
    console.log('👤 Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Authentication error:', authError.message);
      console.log('⚠️ You need to be logged in to test file uploads with correct permissions.');
      console.log('💡 Try logging in through the app first, then run this script again.');
      return;
    }
    
    if (!user) {
      console.log('❌ Not authenticated. Please log in to the application first.');
      console.log('💡 Open the app in your browser, log in, and then run this script again.');
      return;
    }
    
    console.log(`✅ Authenticated as: ${user.email}`);
    
    // Step 2: Check if data-uploads bucket exists
    console.log('\n🔍 Checking if data-uploads bucket exists...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return;
    }
    
    const dataUploadsBucket = buckets.find(b => b.name === 'data-uploads');
    
    if (!dataUploadsBucket) {
      console.error('❌ data-uploads bucket does not exist!');
      console.log('💡 Run the create-storage-bucket script and follow the instructions.');
      return;
    }
    
    console.log('✅ data-uploads bucket exists');
    
    // Step 3: Create a test file
    console.log('\n📝 Creating a test CSV file...');
    const testFilePath = createSampleCSV();
    
    // Step 4: Upload the test file
    console.log('\n📤 Uploading test file to Supabase...');
    const testFile = fs.readFileSync(testFilePath);
    const companyId = 'test-company-123'; // Use a real company ID if available
    const fileName = `${Date.now()}-test_emissions_data.csv`;
    const filePath = `${companyId}/uploads/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-uploads')
      .upload(filePath, testFile, {
        contentType: 'text/csv',
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      
      if (uploadError.message.includes('new row violates row-level security policy')) {
        console.log('\n🔒 Row Level Security (RLS) issue detected:');
        console.log('This error occurs when the current user doesn\'t have permission to upload to the bucket.');
        console.log('\n💡 Make sure you have set up the correct bucket policies:');
        console.log('1. Go to Supabase dashboard > Storage > data-uploads > Policies');
        console.log('2. Add an INSERT policy with condition: (auth.role() = \'authenticated\')');
        console.log('3. Try running this script again after adding the policy');
      }
      
      if (uploadError.message.includes('Bucket not found')) {
        console.log('\n💡 The bucket "data-uploads" was not found or is not accessible.');
        console.log('Make sure you created the bucket with the exact name "data-uploads".');
      }
      
      return;
    }
    
    console.log('✅ File uploaded successfully!');
    console.log('📄 Upload path:', uploadData.path);
    
    // Step 5: Get the public URL
    const { data: urlData } = supabase.storage
      .from('data-uploads')
      .getPublicUrl(uploadData.path);
    
    console.log('🔗 Public URL:', urlData.publicUrl);
    
    // Step 6: Clean up
    console.log('\n🧹 Cleaning up...');
    
    // Remove the uploaded file from Supabase
    const { error: deleteError } = await supabase.storage
      .from('data-uploads')
      .remove([uploadData.path]);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test file from Supabase:', deleteError.message);
    } else {
      console.log('✅ Test file removed from Supabase');
    }
    
    // Delete local test file
    fs.unlinkSync(testFilePath);
    console.log('✅ Local test file deleted');
    
    console.log('\n🎉 Upload test completed successfully!');
    console.log('The Carbon Data Agent should now be able to upload files to Supabase.');
    
  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testUpload()
  .then(() => console.log('\n✨ Test completed'))
  .catch(error => console.error('\n❌ Fatal error:', error)); 