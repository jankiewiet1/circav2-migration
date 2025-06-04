import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vfdbyvnjhimmnbyhxyun.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU'
);

// Function to determine proper scope based on producer vs consumer perspective
function determineProperScope(activity, fuel, unit, description) {
  const lowerDesc = (description || '').toLowerCase();
  const lowerActivity = (activity || '').toLowerCase(); 
  const lowerFuel = (fuel || '').toLowerCase();
  const lowerUnit = (unit || '').toLowerCase();
  
  // === SCOPE 1: Direct emissions from owned/controlled sources ===
  
  // Electricity Generation (Producer perspective) - Scope 1 for power companies
  if (lowerActivity.includes('electricity generation') ||
      lowerActivity.includes('electricity and heat production') ||
      lowerActivity.includes('main activity electricity') ||
      lowerActivity.includes('energy industries') ||
      lowerDesc.includes('electricity generation') ||
      lowerDesc.includes('power plant') ||
      lowerDesc.includes('electricity and heat production')) {
    return 'Scope 1';
  }
  
  // Direct fuel combustion in company-owned equipment
  if ((lowerDesc.includes('fuel combustion activities') ||
       lowerDesc.includes('combustion') ||
       lowerDesc.includes('burning')) &&
      !lowerDesc.includes('purchased') &&
      !lowerDesc.includes('grid') &&
      (lowerUnit.includes('tj/kt') ||
       lowerUnit.includes('kg/tj') ||
       lowerUnit.includes('g/kg') ||
       lowerUnit.includes('g/mj'))) {
    return 'Scope 1';
  }
  
  // Company-owned vehicles and equipment
  if (lowerActivity.includes('company owned') ||
      lowerActivity.includes('fleet') ||
      (lowerActivity.includes('vehicle') && lowerDesc.includes('company'))) {
    return 'Scope 1';
  }
  
  // === SCOPE 2: Indirect emissions from purchased energy ===
  
  // Electricity Consumption (Consumer perspective) - Scope 2 for end users
  if (lowerFuel.includes('electricity') ||
      lowerFuel.includes('grid') ||
      lowerFuel.includes('stroom') || // Dutch for electricity
      lowerDesc.includes('grid mix') ||
      lowerDesc.includes('purchased electricity') ||
      lowerDesc.includes('electricity consumption') ||
      lowerUnit.includes('kg co2e/kwh') ||
      lowerUnit.includes('kg co2e/mwh') ||
      lowerUnit.includes('kg co2e/unit') && lowerFuel.includes('electricity')) {
    return 'Scope 2';
  }
  
  // Other purchased energy
  if (lowerDesc.includes('district heat') ||
      lowerDesc.includes('steam purchased') ||
      lowerDesc.includes('purchased heat') ||
      lowerDesc.includes('purchased cooling')) {
    return 'Scope 2';
  }
  
  // === SCOPE 3: All other indirect emissions ===
  
  // Transport and travel (unless company-owned)
  if (lowerDesc.includes('transport') ||
      lowerDesc.includes('travel') ||
      lowerDesc.includes('flight') ||
      lowerDesc.includes('passenger') ||
      lowerActivity.includes('transport') ||
      lowerActivity.includes('travel') ||
      lowerActivity.includes('aviation') ||
      (lowerActivity.includes('vehicle') && !lowerDesc.includes('company'))) {
    return 'Scope 3';
  }
  
  // Waste management
  if (lowerDesc.includes('waste') ||
      lowerDesc.includes('recycling') ||
      lowerDesc.includes('landfill') ||
      lowerActivity.includes('waste')) {
    return 'Scope 3';
  }
  
  // === DEFAULT: Scope 1 for direct fuel combustion ===
  return 'Scope 1';
}

async function fixScopesProperly() {
  console.log('🔧 Fixing scope assignments with proper producer/consumer distinction...\n');
  
  try {
    // Get all records in batches
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let scopeChanges = {
      'Scope 1 → Scope 2': 0,
      'Scope 1 → Scope 3': 0,
      'Scope 2 → Scope 1': 0,
      'Scope 2 → Scope 3': 0,
      'Scope 3 → Scope 1': 0,
      'Scope 3 → Scope 2': 0
    };
    
    while (true) {
      console.log(`📦 Processing batch starting at offset ${offset}...`);
      
      const { data: records, error } = await supabase
        .from('emission_factor_db')
        .select('id, Activity, Fuel, Unit, description, scope')
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
        const correctScope = determineProperScope(
          record.Activity, 
          record.Fuel, 
          record.Unit, 
          record.description
        );
        
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
              
              // Track scope changes
              const changeKey = `${record.scope} → ${correctScope}`;
              if (scopeChanges[changeKey] !== undefined) {
                scopeChanges[changeKey]++;
              }
              
              // Log interesting changes
              if ((record.scope === 'Scope 2' && correctScope === 'Scope 1') ||
                  (record.scope === 'Scope 1' && correctScope === 'Scope 2')) {
                console.log(`      🔄 ${record.scope} → ${correctScope}: ${record.Activity} | ${record.Fuel}`);
              }
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
    
    console.log(`\n✅ Proper scope correction complete!`);
    console.log(`   Total records processed: ${totalProcessed}`);
    console.log(`   Total records updated: ${totalUpdated}`);
    
    // Show scope change summary
    console.log('\n📊 Scope change summary:');
    Object.entries(scopeChanges).forEach(([change, count]) => {
      if (count > 0) {
        console.log(`   ${change}: ${count} records`);
      }
    });
    
    // Verify scope distribution after update
    console.log('\n📊 Final scope distribution:');
    const { data: scopes } = await supabase
      .from('emission_factor_db')
      .select('scope');
    
    if (scopes) {
      const scopeCounts = {};
      scopes.forEach(record => {
        const scope = record.scope || 'null';
        scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
      });
      
      Object.entries(scopeCounts).forEach(([scope, count]) => {
        const percentage = ((count / scopes.length) * 100).toFixed(1);
        console.log(`   ${scope}: ${count} records (${percentage}%)`);
      });
    }
    
    // Show examples of corrected scopes
    console.log('\n🔍 Examples of corrected scope assignments:');
    
    // Electricity generation examples (should be Scope 1)
    const { data: genExamples } = await supabase
      .from('emission_factor_db')
      .select('Activity, Fuel, Unit, scope')
      .eq('scope', 'Scope 1')
      .ilike('Activity', '%electricity%')
      .limit(3);
      
    if (genExamples && genExamples.length > 0) {
      console.log('\nScope 1 - Electricity Generation (Producer perspective):');
      genExamples.forEach(record => {
        console.log(`   ${record.Activity} | Fuel: ${record.Fuel} | Unit: ${record.Unit}`);
      });
    }
    
    // Electricity consumption examples (should be Scope 2)
    const { data: consExamples } = await supabase
      .from('emission_factor_db')
      .select('Activity, Fuel, Unit, scope')
      .eq('scope', 'Scope 2')
      .or('Fuel.ilike.%electricity%,Fuel.ilike.%grid%,Fuel.ilike.%stroom%')
      .limit(3);
      
    if (consExamples && consExamples.length > 0) {
      console.log('\nScope 2 - Electricity Consumption (Consumer perspective):');
      consExamples.forEach(record => {
        console.log(`   ${record.Activity} | Fuel: ${record.Fuel} | Unit: ${record.Unit}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fixScopesProperly().catch(console.error); 