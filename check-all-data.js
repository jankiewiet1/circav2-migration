import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

async function checkAllData() {
  console.log('🔍 Checking ALL data in database (no company filter)...\n');
  
  try {
    // Check ALL emission_entries regardless of company
    console.log('📋 ALL EMISSION ENTRIES:');
    const { data: allEntries, count: entriesCount } = await supabase
      .from('emission_entries')
      .select('*', { count: 'exact' })
      .limit(20);
    
    console.log(`Total entries in database: ${entriesCount}`);
    
    if (allEntries && allEntries.length > 0) {
      console.log(`Found ${allEntries.length} entries (showing first 20):`);
      allEntries.forEach((entry, i) => {
        console.log(`${i+1}. ID: ${entry.id}`);
        console.log(`   Company ID: ${entry.company_id}`);
        console.log(`   Date: ${entry.date}`);
        console.log(`   Description: ${entry.description}`);
        console.log(`   Quantity: ${entry.quantity} ${entry.unit}`);
        console.log(`   Category: ${entry.category}`);
        console.log(`   Scope: ${entry.scope}`);
        console.log(`   Match Status: ${entry.match_status}`);
        console.log('');
      });
    } else {
      console.log('No emission entries found in entire database');
    }

    // Check ALL emission_calc regardless of company
    console.log('\n🧮 ALL EMISSION CALCULATIONS:');
    const { data: allCalculations, count: calculationsCount } = await supabase
      .from('emission_calc')
      .select('*', { count: 'exact' })
      .order('calculated_at', { ascending: false })
      .limit(20);
    
    console.log(`Total calculations in database: ${calculationsCount}`);
    
    if (allCalculations && allCalculations.length > 0) {
      console.log(`Found ${allCalculations.length} calculations (showing first 20):`);
      allCalculations.forEach((calc, i) => {
        console.log(`${i+1}. ID: ${calc.id}`);
        console.log(`   Company ID: ${calc.company_id}`);
        console.log(`   Entry ID: ${calc.entry_id}`);
        console.log(`   Method: ${calc.calculation_method}`);
        console.log(`   Total Emissions: ${calc.total_emissions}`);
        console.log(`   Calculated At: ${calc.calculated_at}`);
        console.log(`   Similarity Score: ${calc.similarity_score}`);
        console.log(`   Processing Time: ${calc.processing_time_ms}`);
        console.log(`   Scope: ${calc.scope}`);
        
        if (calc.activity_data) {
          try {
            const activityData = typeof calc.activity_data === 'string' 
              ? JSON.parse(calc.activity_data) 
              : calc.activity_data;
            console.log(`   Activity Data: ${JSON.stringify(activityData, null, 2)}`);
          } catch (e) {
            console.log(`   Activity Data (raw): ${calc.activity_data}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('No calculations found in entire database');
    }

    // Check companies table
    console.log('\n🏢 ALL COMPANIES:');
    const { data: companies } = await supabase
      .from('companies')
      .select('*');
    
    if (companies && companies.length > 0) {
      console.log(`Found ${companies.length} companies:`);
      companies.forEach((company, i) => {
        console.log(`${i+1}. ID: ${company.id}, Name: ${company.name}`);
      });
    } else {
      console.log('No companies found');
    }

    // Check profile/auth if exists
    console.log('\n👤 AUTH CHECK:');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`Current user: ${user.email || user.id}`);
    } else {
      console.log('No authenticated user');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllData().catch(console.error); 