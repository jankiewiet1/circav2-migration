import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

// Function to determine proper scope based on activity and fuel type
function determineScope(activity, fuel, description) {
  const lowerDesc = (description || '').toLowerCase();
  const lowerActivity = (activity || '').toLowerCase(); 
  const lowerFuel = (fuel || '').toLowerCase();
  
  // Scope 2: Electricity and purchased energy
  if (lowerDesc.includes('electricity') || 
      lowerDesc.includes('grid') ||
      lowerDesc.includes('power') ||
      lowerActivity.includes('electricity') ||
      lowerActivity.includes('grid') ||
      lowerActivity.includes('power') ||
      lowerFuel.includes('electricity') ||
      lowerDesc.includes('district heat') ||
      lowerDesc.includes('steam purchased') ||
      lowerDesc.includes('kwh') ||
      lowerDesc.includes('mwh')) {
    return 'Scope 2';
  }
  
  // Scope 3: Transport (business travel), waste, etc.
  if (lowerDesc.includes('transport') ||
      lowerDesc.includes('travel') ||
      lowerDesc.includes('flight') ||
      lowerDesc.includes('passenger') ||
      lowerDesc.includes('vehicle') && !lowerDesc.includes('company owned') ||
      lowerDesc.includes('waste') ||
      lowerDesc.includes('recycling') ||
      lowerActivity.includes('transport') ||
      lowerActivity.includes('travel') ||
      lowerActivity.includes('waste')) {
    return 'Scope 3';
  }
  
  // Default to Scope 1 for direct fuel combustion
  return 'Scope 1';
}

async function fixScopes() {
  console.log('🔧 Fixing scope assignments in emission_factor_db...\n');
  
  try {
    // Get all records in batches to avoid memory issues
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    
    while (true) {
      console.log(`📦 Processing batch starting at offset ${offset}...`);
      
      const { data: records, error } = await supabase
        .from('emission_factor_db')
        .select('id, Activity, Fuel, description, scope')
        .range(offset, offset + batchSize - 1);
      
      if (error) {
        console.error('❌ Error fetching records:', error);
        break;
      }
      
      if (!records || records.length === 0) {
        console.log('✅ No more records to process');
        break;
      }
      
      console.log(`   Processing ${records.length} records...`);
      
      let batchUpdated = 0;
      
      // Process each record
      for (const record of records) {
        const correctScope = determineScope(record.Activity, record.Fuel, record.description);
        
        // Only update if scope needs correction
        if (record.scope !== correctScope) {
          try {
            const { error: updateError } = await supabase
              .from('emission_factor_db')
              .update({ scope: correctScope })
              .eq('id', record.id);
            
            if (updateError) {
              console.error(`❌ Error updating record ${record.id}:`, updateError);
            } else {
              batchUpdated++;
              totalUpdated++;
            }
          } catch (updateErr) {
            console.error(`❌ Exception updating record ${record.id}:`, updateErr);
          }
        }
        
        totalProcessed++;
      }
      
      console.log(`   Batch complete. Updated ${batchUpdated} records in this batch.`);
      console.log(`   Total: ${totalUpdated} updated of ${totalProcessed} processed so far`);
      
      // Move to next batch
      offset += batchSize;
      
      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Scope correction complete!`);
    console.log(`   Total records processed: ${totalProcessed}`);
    console.log(`   Total records updated: ${totalUpdated}`);
    
    // Verify scope distribution after update
    console.log('\n📊 Checking new scope distribution...');
    const { data: scopes } = await supabase
      .from('emission_factor_db')
      .select('scope');
    
    if (scopes) {
      const scopeCounts = {};
      scopes.forEach(record => {
        const scope = record.scope || 'null';
        scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
      });
      
      console.log('New scope distribution:');
      Object.entries(scopeCounts).forEach(([scope, count]) => {
        const percentage = ((count / scopes.length) * 100).toFixed(1);
        console.log(`   ${scope}: ${count} records (${percentage}%)`);
      });
    }
    
    // Show samples of different scopes
    console.log('\n🔍 Sample records by scope:');
    
    for (const scope of ['Scope 1', 'Scope 2', 'Scope 3']) {
      const { data: samples } = await supabase
        .from('emission_factor_db')
        .select('Activity, Fuel, Unit, scope, description')
        .eq('scope', scope)
        .limit(3);
      
      if (samples && samples.length > 0) {
        console.log(`\n${scope} examples:`);
        samples.forEach(record => {
          console.log(`   ${record.Activity} | Fuel: ${record.Fuel} | Unit: ${record.Unit}`);
        });
      } else {
        console.log(`\n${scope}: No records found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fixScopes().catch(console.error); 