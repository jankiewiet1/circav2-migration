import { createClient } from '@supabase/supabase-js';


// Environment variables check
if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY environment variable is required");
  console.error("Please set it in your environment");
  process.exit(1);
}
const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'process.env.SUPABASE_ANON_KEY'
);

async function checkCalculationData() {
  console.log('🔍 Checking calculation data issues...\n');
  
  try {
    // Check emission entries vs calculations dates
    console.log('📅 Date Analysis:');
    const { data: entries } = await supabase
      .from('emission_entries')
      .select(`
        id,
        date,
        description,
        created_at,
        emission_calc(
          id,
          calculated_at,
          calculation_method,
          total_emissions,
          activity_data
        )
      `)
      .limit(5);
    
    if (entries) {
      entries.forEach((entry, i) => {
        console.log(`\n--- Entry ${i + 1} ---`);
        console.log(`Entry ID: ${entry.id}`);
        console.log(`Original Date: ${entry.date}`);
        console.log(`Entry Created: ${entry.created_at}`);
        console.log(`Description: ${entry.description}`);
        
        if (entry.emission_calc) {
          entry.emission_calc.forEach((calc, j) => {
            console.log(`  Calc ${j + 1}:`);
            console.log(`    Method: ${calc.calculation_method}`);
            console.log(`    Calculated At: ${calc.calculated_at}`);
            console.log(`    Emissions: ${calc.total_emissions}`);
            console.log(`    Activity Data: ${JSON.stringify(calc.activity_data).substring(0, 100)}...`);
          });
        } else {
          console.log('  No calculations found');
        }
      });
    }
    
    // Check for duplicate calculations
    console.log('\n🔄 Duplicate Calculation Analysis:');
    const { data: duplicates } = await supabase
      .from('emission_calc')
      .select('entry_id, calculation_method, total_emissions, calculated_at')
      .order('entry_id, calculated_at');
    
    if (duplicates) {
      const entryGroups = {};
      duplicates.forEach(calc => {
        if (!entryGroups[calc.entry_id]) {
          entryGroups[calc.entry_id] = [];
        }
        entryGroups[calc.entry_id].push(calc);
      });
      
      console.log(`Found calculations for ${Object.keys(entryGroups).length} entries`);
      
      Object.entries(entryGroups).forEach(([entryId, calcs]) => {
        if (calcs.length > 1) {
          console.log(`\nEntry ${entryId} has ${calcs.length} calculations:`);
          calcs.forEach((calc, i) => {
            console.log(`  ${i + 1}. ${calc.calculation_method}: ${calc.total_emissions} kg CO2e (${calc.calculated_at})`);
          });
        }
      });
    }
    
    // Check future dates
    console.log('\n🔮 Future Date Check:');
    const today = new Date().toISOString().split('T')[0];
    const { data: futureEntries } = await supabase
      .from('emission_entries')
      .select('id, date, description')
      .gt('date', today);
    
    if (futureEntries && futureEntries.length > 0) {
      console.log(`Found ${futureEntries.length} entries with future dates:`);
      futureEntries.forEach(entry => {
        console.log(`  ${entry.date}: ${entry.description}`);
      });
    } else {
      console.log('No future dates found');
    }
    
    // Check calculation confidence and methods
    console.log('\n📊 Confidence Analysis:');
    const { data: confidenceData } = await supabase
      .from('emission_calc')
      .select('calculation_method, activity_data, total_emissions, similarity_score, calculated_at')
      .order('calculated_at', { ascending: false })
      .limit(10);
    
    if (confidenceData) {
      confidenceData.forEach((calc, i) => {
        console.log(`\n--- Recent Calc ${i + 1} ---`);
        console.log(`Method: ${calc.calculation_method}`);
        console.log(`Emissions: ${calc.total_emissions}`);
        console.log(`Similarity: ${calc.similarity_score}`);
        
        try {
          const activityData = typeof calc.activity_data === 'string' 
            ? JSON.parse(calc.activity_data) 
            : calc.activity_data;
          
          if (activityData) {
            console.log(`Confidence: ${activityData.confidence || 'N/A'}`);
            console.log(`Category: ${activityData.category || 'N/A'}`);
            console.log(`Source: ${activityData.source || 'N/A'}`);
          }
        } catch (e) {
          console.log(`Activity Data: ${calc.activity_data}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCalculationData().catch(console.error); 