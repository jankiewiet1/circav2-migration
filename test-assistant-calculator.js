import { createClient } from '@supabase/supabase-js';
import { assistantCalculator } from './src/services/assistantEmissionCalculator.ts';

// Initialize Supabase client
const supabaseUrl = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MzE1NzQsImV4cCI6MjA1MDEwNzU3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssistantCalculator() {
  try {
    console.log('🧪 Testing OpenAI Assistant Calculator...');
    
    // First, let's check how many entries exist with different match_status values
    console.log('\n📊 Checking emission entries by match_status...');
    
    const { data: allEntries, error: allError } = await supabase
      .from('emission_entries')
      .select('id, match_status, category, description, quantity, unit')
      .limit(10);
    
    if (allError) {
      console.error('❌ Error fetching entries:', allError);
      return;
    }
    
    console.log(`📋 Found ${allEntries?.length || 0} entries (showing first 10):`);
    allEntries?.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.description} - Status: ${entry.match_status || 'null'}`);
    });
    
    // Count by status
    const { data: unmatchedCount } = await supabase
      .from('emission_entries')
      .select('id', { count: 'exact' })
      .eq('match_status', 'unmatched');
      
    const { data: matchedCount } = await supabase
      .from('emission_entries')
      .select('id', { count: 'exact' })
      .eq('match_status', 'matched');
      
    const { data: nullCount } = await supabase
      .from('emission_entries')
      .select('id', { count: 'exact' })
      .is('match_status', null);
    
    console.log(`\n📈 Entry counts by status:`);
    console.log(`  - Unmatched: ${unmatchedCount?.length || 0}`);
    console.log(`  - Matched: ${matchedCount?.length || 0}`);
    console.log(`  - Null: ${nullCount?.length || 0}`);
    
    // Test the assistant calculator with a company ID
    // You'll need to replace this with an actual company ID from your database
    const testCompanyId = allEntries?.[0]?.company_id;
    
    if (!testCompanyId) {
      console.log('❌ No company ID found in entries');
      return;
    }
    
    console.log(`\n🧠 Testing Assistant Calculator for company: ${testCompanyId}`);
    
    // Test with includeCalculated = false (only unmatched)
    console.log('\n🔍 Testing with includeCalculated = false (only unmatched entries)...');
    const result1 = await assistantCalculator.calculateCompanyEmissions(testCompanyId, undefined, false);
    console.log(`✅ Found ${result1.summary.total_entries} unmatched entries`);
    
    // Test with includeCalculated = true (all entries)
    console.log('\n🔍 Testing with includeCalculated = true (all entries)...');
    const result2 = await assistantCalculator.calculateCompanyEmissions(testCompanyId, undefined, true);
    console.log(`✅ Found ${result2.summary.total_entries} total entries`);
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testAssistantCalculator(); 