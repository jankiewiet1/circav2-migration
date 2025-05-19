// tests/verify-supabase.js

// Direct Supabase client instantiation for testing
import { createClient } from '@supabase/supabase-js';

// Supabase project credentials - copied from src/integrations/supabase/client.ts
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";

// Create the Supabase client directly
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
    }
  }
);

/**
 * Test script to verify Climatiq table and functionality
 */
async function verifySupabase() {
  console.log('🧪 Testing Supabase connectivity and Climatiq table setup...');
  
  // 1. Check authentication status
  console.log('\n🔑 Checking authentication status...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('❌ Authentication error:', authError.message);
    console.log('⚠️ You might need to log in to the application first. Open the app and authenticate.');
  } else if (user) {
    console.log(`✅ Authenticated as ${user.email}`);
  } else {
    console.log('⚠️ Not authenticated. You might need to log in to test RLS policies.');
  }
  
  // 2. Check if emission_calc_climatiq table exists
  console.log('\n📋 Checking if emission_calc_climatiq table exists...');
  try {
    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .eq('tablename', 'emission_calc_climatiq');
    
    if (tableError) {
      console.error('❌ Error checking table existence:', tableError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ Table emission_calc_climatiq exists');
      
      // 3. Check table columns
      console.log('\n📑 Fetching table columns...');
      const { data: columnInfo, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'emission_calc_climatiq');
        
      if (infoError) {
        console.error('❌ Error fetching column info:', infoError.message);
      } else if (columnInfo && columnInfo.length > 0) {
        console.log('✅ Table columns:', columnInfo.map(c => c.column_name).join(', '));
      } else {
        console.log('⚠️ No columns found. This is unexpected.');
      }
      
      // 4. Check RLS policies
      console.log('\n🔒 Checking RLS policies...');
      const { data: tableInfo, error: tableInfoError } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'emission_calc_climatiq')
        .single();
        
      if (tableInfoError) {
        console.error('❌ Error checking RLS status:', tableInfoError.message);
      } else if (tableInfo) {
        console.log(`✅ RLS enabled: ${tableInfo.rowsecurity}`);
      }
      
      // 5. Insert test data if authenticated
      if (user) {
        console.log('\n📝 Attempting to insert test data...');
        
        // Get a company ID
        const { data: companies, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .limit(1);
        
        if (companyError) {
          console.error('❌ Error fetching companies:', companyError.message);
        } else if (companies && companies.length > 0) {
          const companyId = companies[0].id;
          console.log(`✅ Using company ID: ${companyId}`);
          
          // Insert test data
          const testData = {
            company_id: companyId,
            entry_id: null,
            total_emissions: 100.5,
            emissions_unit: 'kg',
            climatiq_category: 'Test Category',
            climatiq_activity_id: 'test-activity-id',
            scope: 1
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from('emission_calc_climatiq')
            .insert(testData)
            .select();
          
          if (insertError) {
            console.error('❌ Error inserting test data:', insertError.message);
          } else if (insertData && insertData.length > 0) {
            console.log('✅ Successfully inserted test data:', insertData[0]);
            
            // Clean up
            const { error: deleteError } = await supabase
              .from('emission_calc_climatiq')
              .delete()
              .eq('id', insertData[0].id);
            
            if (deleteError) {
              console.error('❌ Error cleaning up test data:', deleteError.message);
            } else {
              console.log('✅ Successfully cleaned up test data');
            }
          } else {
            console.log('⚠️ Insert succeeded but no data returned');
          }
        } else {
          console.log('⚠️ No companies found. Cannot insert test data.');
        }
      }
    } else {
      console.error('❌ Table emission_calc_climatiq does not exist. Check your SQL implementation.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n✨ Verification complete!');
}

// Run the verification
verifySupabase()
  .catch(err => {
    console.error('Verification failed with error:', err);
  }); 