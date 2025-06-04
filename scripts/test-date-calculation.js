import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDateCalculation() {
  console.log('🔍 Testing date calculation with RAG function...\n');
  
  // Create a test entry with a specific date (not today)
  const testDate = '2024-12-15'; // A date that's clearly not today
  const testEntry = {
    date: testDate,
    category: 'fuel',
    description: '100 liters of diesel fuel',
    quantity: 100,
    unit: 'L',
    scope: 1,
    company_id: '36a50061-5ab2-47f5-8871-a8881e1e1b8f', // Use the company ID from screenshot
    match_status: 'unmatched'
  };
  
  console.log(`📅 Creating test entry with date: ${testDate}`);
  
  // Insert test entry
  const { data: insertedEntry, error: insertError } = await supabase
    .from('emission_entries')
    .insert(testEntry)
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Error creating test entry:', insertError);
    return;
  }
  
  console.log(`✅ Test entry created with ID: ${insertedEntry.id}`);
  console.log(`📅 Entry date: ${insertedEntry.date}`);
  
  // Test RAG calculation
  console.log('\n🤖 Testing RAG calculation...');
  
  try {
    const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        raw_input: '100 liters of diesel fuel',
        company_id: testEntry.company_id,
        entry_id: insertedEntry.id,
        demo_mode: false
      })
    });
    
    const ragResult = await ragResponse.json();
    
    if (ragResult.success) {
      console.log('✅ RAG calculation successful');
      console.log(`📊 Emissions: ${ragResult.calculation?.total_emissions} kg CO2e`);
      
      // Now check what date was stored in the database
      const { data: calculation, error: calcError } = await supabase
        .from('emission_calc')
        .select('id, calculated_at, calculation_method, entry_id')
        .eq('entry_id', insertedEntry.id)
        .eq('calculation_method', 'RAG')
        .single();
        
      if (!calcError && calculation) {
        const calcDate = new Date(calculation.calculated_at).toISOString().split('T')[0];
        console.log(`📅 Stored calculation date: ${calcDate}`);
        console.log(`📅 Expected entry date: ${testDate}`);
        console.log(`✅ Date match: ${calcDate === testDate ? 'YES' : 'NO'}`);
        
        if (calcDate === testDate) {
          console.log('🎉 SUCCESS: RAG calculation is using the correct entry date!');
        } else {
          console.log('❌ PROBLEM: RAG calculation is not using the entry date');
        }
      } else {
        console.log('❌ Could not fetch calculation from database');
      }
    } else {
      console.log('❌ RAG calculation failed:', ragResult.error);
    }
  } catch (error) {
    console.log('❌ RAG test error:', error.message);
  }
  
  // Clean up - delete test entry
  console.log('\n🧹 Cleaning up test entry...');
  await supabase.from('emission_calc').delete().eq('entry_id', insertedEntry.id);
  await supabase.from('emission_entries').delete().eq('id', insertedEntry.id);
  console.log('✅ Test entry cleaned up');
}

testDateCalculation().catch(console.error); 