import { createClient } from '@supabase/supabase-js';

// Supabase project credentials - copied from src/integrations/supabase/client.ts

// Environment variables check
if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY environment variable is required");
  console.error("Please set it in your environment");
  process.exit(1);
}
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_ANON_KEY || "your-anon-key-here";

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

// Function to check storage bucket and provide setup instructions
async function checkStorageBucket() {
  console.log('🔍 Checking existing storage buckets...');
  
  try {
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      console.log('\n🚨 IMPORTANT: You need admin access to manage buckets.');
      printBucketSetupInstructions();
      return;
    }
    
    console.log('📋 Existing buckets:', buckets?.map(b => b.name).join(', ') || 'None');
    
    // Check if data-uploads bucket exists
    const dataUploadsBucket = buckets?.find(b => b.name === 'data-uploads');
    
    if (dataUploadsBucket) {
      console.log('✅ data-uploads bucket exists!');
      
      // Test bucket access
      console.log('🧪 Testing bucket access...');
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('data-uploads')
        .upload('test.txt', testFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('❌ Test upload failed:', uploadError.message);
        
        if (uploadError.message.includes('Bucket not found')) {
          console.log('\n🚨 The bucket exists but is not accessible. You may need to check bucket permissions.');
          printBucketSetupInstructions();
        } else {
          console.log('\n⚠️ There was an issue uploading to the bucket. Check RLS policies in Supabase.');
        }
      } else {
        console.log('✅ Test upload successful!');
        
        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('data-uploads')
          .remove([uploadData.path]);
          
        if (deleteError) {
          console.warn('⚠️ Couldn\'t clean up test file:', deleteError.message);
        } else {
          console.log('🧹 Test file removed successfully');
        }
        
        console.log('\n🎉 Your storage bucket is properly configured and working!');
      }
    } else {
      console.log('❌ data-uploads bucket does not exist');
      printBucketSetupInstructions();
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    printBucketSetupInstructions();
  }
}

// Function to print bucket setup instructions
function printBucketSetupInstructions() {
  console.log('\n📝 SETUP INSTRUCTIONS:');
  console.log('====================');
  console.log('You need to create the "data-uploads" bucket in your Supabase dashboard:');
  console.log('');
  console.log('1. Go to https://app.supabase.io/project/vfdbyvnjhimmnbyhxyun');
  console.log('2. Navigate to "Storage" in the left sidebar');
  console.log('3. Click "New bucket"');
  console.log('4. Name the bucket exactly "data-uploads"');
  console.log('5. Make sure "Public bucket" is checked');
  console.log('6. Click "Create bucket"');
  console.log('');
  console.log('7. After creating the bucket, click on it to open its settings');
  console.log('8. Go to the "Policies" tab');
  console.log('9. Create the following policies:');
  console.log('   - INSERT: Allow authenticated users to upload files');
  console.log('   - SELECT: Allow authenticated users to view files');
  console.log('   - UPDATE: Allow authenticated users to update files (optional)');
  console.log('   - DELETE: Allow authenticated users to delete files (optional)');
  console.log('');
  console.log('For a quick setup, you can use these policies:');
  console.log('   - INSERT: (auth.role() = \'authenticated\')');
  console.log('   - SELECT: (auth.role() = \'authenticated\')');
  console.log('   - UPDATE: (auth.role() = \'authenticated\')');
  console.log('   - DELETE: (auth.role() = \'authenticated\')');
  console.log('');
  console.log('Run this script again after creating the bucket to verify it works.');
}

// Run the check function
checkStorageBucket()
  .then(() => console.log('✨ Storage bucket check complete'))
  .catch(error => console.error('❌ Fatal error:', error)); 