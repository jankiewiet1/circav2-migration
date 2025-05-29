import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MzE1NzQsImV4cCI6MjA1MDEwNzU3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleEntry() {
  try {
    console.log('🧪 SAFE TEST: Testing OpenAI Assistant with ONE entry only...');
    
    // First, check how many unmatched entries exist
    console.log('\n📊 Checking unmatched entries...');
    
    const { data: unmatchedEntries, error: unmatchedError } = await supabase
      .from('emission_entries')
      .select('id, company_id, match_status, category, description, quantity, unit')
      .eq('match_status', 'unmatched')
      .limit(5);
    
    if (unmatchedError) {
      console.error('❌ Error fetching unmatched entries:', unmatchedError);
      return;
    }
    
    if (!unmatchedEntries || unmatchedEntries.length === 0) {
      console.log('❌ No unmatched entries found. All entries may already be calculated.');
      
      // Check if there are any entries at all
      const { data: allEntries } = await supabase
        .from('emission_entries')
        .select('id, match_status')
        .limit(5);
        
      console.log('📋 Sample entries:', allEntries?.map(e => ({ id: e.id, status: e.match_status })));
      return;
    }
    
    console.log(`✅ Found ${unmatchedEntries.length} unmatched entries (showing first 5):`);
    unmatchedEntries.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.description} - ${entry.quantity} ${entry.unit} (${entry.category})`);
    });
    
    // Get the company ID from the first entry
    const testCompanyId = unmatchedEntries[0].company_id;
    console.log(`\n🎯 Testing with company: ${testCompanyId}`);
    
    // Import the assistant calculator (this would need to be done differently in a real Node.js environment)
    console.log('\n⚠️  NOTE: This test script shows the structure, but would need proper module imports in a real environment.');
    console.log('🔧 To actually test, use the browser console or add a test button to the UI.');
    
    // Show what the test would do
    console.log('\n📝 Test plan:');
    console.log('1. Import: import { assistantCalculator } from "./src/services/assistantEmissionCalculator"');
    console.log('2. Run: const result = await assistantCalculator.testSingleEntryCalculation(companyId)');
    console.log('3. Check: console.log(result)');
    
    console.log('\n💡 Recommended: Add a "Test Single Entry" button to the DataUpload page UI');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testSingleEntry(); 