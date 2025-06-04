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

// Function to determine proper scope based on activity and fuel type
function determineScope(activityType, fuel, description) {
  const lowerDesc = description.toLowerCase();
  const lowerFuel = fuel?.toLowerCase() || '';
  
  // Scope 2: Electricity and purchased energy
  if (lowerDesc.includes('electricity') || 
      lowerDesc.includes('grid') ||
      lowerDesc.includes('power generation') ||
      lowerFuel.includes('electricity') ||
      lowerDesc.includes('district heat') ||
      lowerDesc.includes('steam purchased')) {
    return 'Scope 2';
  }
  
  // Scope 3: Transport (unless company-owned), waste, business travel
  if (lowerDesc.includes('transport') ||
      lowerDesc.includes('travel') ||
      lowerDesc.includes('flight') ||
      lowerDesc.includes('vehicle') ||
      lowerDesc.includes('waste') ||
      lowerDesc.includes('recycling') ||
      lowerDesc.includes('passenger')) {
    return 'Scope 3';
  }
  
  // Default to Scope 1 for direct fuel combustion
  return 'Scope 1';
}

// Function to parse description field
function parseDescription(description) {
  const parsed = {
    activity: null,
    fuel: null,
    country: null,
    gas: null,
    unit: null,
    source: null
  };
  
  try {
    // Extract activity (everything before first |)
    const activityMatch = description.match(/^([^|]+)/);
    if (activityMatch) {
      parsed.activity = activityMatch[1].trim();
    }
    
    // Extract fuel
    const fuelMatch = description.match(/Fuel:\s*([^|]+)/);
    if (fuelMatch) {
      parsed.fuel = fuelMatch[1].trim();
    }
    
    // Extract country
    const countryMatch = description.match(/Country:\s*([^|]+)/);
    if (countryMatch) {
      parsed.country = countryMatch[1].trim();
    }
    
    // Extract gas
    const gasMatch = description.match(/Gas:\s*([^|]+)/);
    if (gasMatch) {
      parsed.gas = gasMatch[1].trim();
    }
    
    // Extract unit
    const unitMatch = description.match(/Unit:\s*([^|]+)/);
    if (unitMatch) {
      parsed.unit = unitMatch[1].trim();
    }
    
    // Extract source
    const sourceMatch = description.match(/Source:\s*([^|]+)/);
    if (sourceMatch) {
      parsed.source = sourceMatch[1].trim();
    }
    
  } catch (error) {
    console.error('Error parsing description:', error);
  }
  
  return parsed;
}

async function fixEmissionFactorData() {
  console.log('🔧 Starting emission factor data recovery and scope correction...\n');
  
  try {
    // Get all records in batches
    const batchSize = 1000;
    let offset = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    
    while (true) {
      console.log(`📦 Processing batch starting at offset ${offset}...`);
      
      const { data: records, error } = await supabase
        .from('emission_factor_db')
        .select('id, description, scope')
        .not('description', 'is', null)
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
      
      // Process each record
      for (const record of records) {
        const parsed = parseDescription(record.description);
        const correctScope = determineScope(parsed.activity, parsed.fuel, record.description);
        
        // Only update if scope needs correction or if we have parsed data
        const needsUpdate = record.scope !== correctScope || 
                           parsed.activity || parsed.fuel || parsed.unit;
        
        if (needsUpdate) {
          try {
            const { error: updateError } = await supabase
              .from('emission_factor_db')
              .update({
                activity: parsed.activity,
                fuel: parsed.fuel,
                country: parsed.country,
                unit: parsed.unit,
                source: parsed.source,
                scope: correctScope,
                // Set a default ef_value of 1.0 for now (will need proper values later)
                ef_value: 1.0,
                ghg_unit: 'kg CO2e'
              })
              .eq('id', record.id);
            
            if (updateError) {
              console.error(`❌ Error updating record ${record.id}:`, updateError);
            } else {
              totalUpdated++;
            }
          } catch (updateErr) {
            console.error(`❌ Exception updating record ${record.id}:`, updateErr);
          }
        }
        
        totalProcessed++;
      }
      
      console.log(`   Batch complete. Updated ${totalUpdated} of ${totalProcessed} records so far`);
      
      // Move to next batch
      offset += batchSize;
      
      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Data recovery complete!`);
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
        console.log(`   ${scope}: ${count} records`);
      });
    }
    
    // Show samples of different scopes
    console.log('\n🔍 Sample records by scope:');
    
    for (const scope of ['Scope 1', 'Scope 2', 'Scope 3']) {
      const { data: samples } = await supabase
        .from('emission_factor_db')
        .select('activity, fuel, unit, scope')
        .eq('scope', scope)
        .not('activity', 'is', null)
        .limit(3);
      
      console.log(`\n${scope} examples:`);
      samples?.forEach(record => {
        console.log(`   ${record.activity} | Fuel: ${record.fuel} | Unit: ${record.unit}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

fixEmissionFactorData().catch(console.error); 