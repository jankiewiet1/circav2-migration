import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase credentials from the client config

// Environment variables check
if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY environment variable is required");
  console.error("Please set it in your environment");
  process.exit(1);
}
const supabaseUrl = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDates() {
  console.log('🔍 Checking date issue in database...\n');
  
  // First check all calculations in the table
  const { data: allCalcs, error: calcError } = await supabase
    .from('emission_calc')
    .select('id, calculated_at, calculation_method, entry_id, total_emissions')
    .limit(10)
    .order('calculated_at', { ascending: false });
    
  if (calcError) {
    console.error('❌ Error fetching calculations:', calcError);
    return;
  }
  
  console.log(`📊 Found ${allCalcs.length} calculations in emission_calc table:\n`);
  
  // Check if all calculations from today
  const today = new Date().toISOString().split('T')[0];
  const todayCalcs = allCalcs.filter(calc => 
    calc.calculated_at.startsWith(today)
  );
  
  console.log(`📅 Total calculations: ${allCalcs.length}`);
  console.log(`📅 Calculations from today (${today}): ${todayCalcs.length}`);
  
  if (todayCalcs.length === allCalcs.length && allCalcs.length > 0) {
    console.log('⚠️  ALL calculations show today\'s date - this confirms the date issue\n');
  }
  
  // Now check specific calculations with their entries
  for (let i = 0; i < Math.min(5, allCalcs.length); i++) {
    const calc = allCalcs[i];
    console.log(`${i + 1}. Calculation ID: ${calc.id}`);
    console.log(`   Method: ${calc.calculation_method}`);
    console.log(`   Entry ID: ${calc.entry_id || 'NULL'}`);
    console.log(`   Calculated At: ${new Date(calc.calculated_at).toDateString()}`);
    console.log(`   Total Emissions: ${calc.total_emissions}`);
    
    // If there's an entry_id, fetch the actual entry date
    if (calc.entry_id) {
      const { data: entry, error: entryError } = await supabase
        .from('emission_entries')
        .select('date, description')
        .eq('id', calc.entry_id)
        .single();
        
      if (!entryError && entry) {
        const entryDate = new Date(entry.date);
        const calcDate = new Date(calc.calculated_at);
        const daysDiff = Math.round((calcDate - entryDate) / (1000 * 60 * 60 * 24));
        
        console.log(`   Entry Date: ${entryDate.toDateString()}`);
        console.log(`   Description: ${entry.description}`);
        console.log(`   Days Difference: ${daysDiff} days`);
        console.log(`   Same Date: ${entryDate.toDateString() === calcDate.toDateString() ? '✅' : '❌'}`);
      } else {
        console.log(`   Entry: Could not fetch (${entryError?.message || 'not found'})`);
      }
    } else {
      console.log(`   Entry: No entry_id linked`);
    }
    console.log('');
  }
}

checkDates().catch(console.error); 