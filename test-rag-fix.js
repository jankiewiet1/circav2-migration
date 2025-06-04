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

async function testRAGSystem() {
  console.log('🔍 Testing updated RAG system...\n');
  
  // Check embeddings status
  console.log('📊 Checking embedding status...');
  const { count: totalCount } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true });
    
  const { count: embeddingCount } = await supabase
    .from('emission_factor_db')
    .select('*', { count: 'exact', head: true })
    .not('embeddings', 'is', null);
    
  const completionRate = totalCount > 0 ? (embeddingCount / totalCount * 100).toFixed(1) : 0;
  
  console.log(`   Total records: ${totalCount || 0}`);
  console.log(`   With embeddings: ${embeddingCount || 0}`);
  console.log(`   Completion rate: ${completionRate}%\n`);
  
  // Test RAG with natural gas (the one that was failing)
  console.log('🧪 Testing RAG with natural gas (previously failing)...');
  
  try {
    const response = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw_input: 'Natural gas consumption 4684.2 m3 for heating',
        demo_mode: true
      })
    });
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    if (!response.ok) {
      console.log('❌ HTTP error:', response.status, response.statusText);
      return;
    }
    
    const result = JSON.parse(responseText);
    
    if (result.success) {
      console.log('✅ RAG test SUCCESSFUL!');
      console.log('   🔍 Matched activity:', result.matched_activity || 'N/A');
      console.log('   📊 Emission factor:', result.emission_factor, result.emission_factor_unit);
      console.log('   💨 Total emissions:', result.total_emissions, result.emissions_unit);
      console.log('   📚 Source:', result.source);
      console.log('   🎯 Confidence:', (result.confidence_score * 100).toFixed(1) + '%');
      console.log('   🔗 Similarity:', (result.similarity_score * 100).toFixed(1) + '%');
      console.log('   ⏱️  Processing time:', result.processing_time_ms + 'ms');
      console.log('   ✅ Validation passed:', result.validation_passed);
    } else {
      console.log('❌ RAG test failed:');
      console.log('   Error:', result.error);
      if (result.parsed_data) {
        console.log('   Parsed data:', result.parsed_data);
      }
      if (result.suggestion) {
        console.log('   Suggestion:', result.suggestion);
      }
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  
  // Check actual database records
  console.log('\n📊 Checking actual database records...');
  const { data: recentCalcs, error } = await supabase
    .from('emission_calc')
    .select('*')
    .eq('calculation_method', 'RAG')
    .order('calculated_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.log('❌ Database query error:', error);
  } else {
    console.log('Recent RAG calculations:', recentCalcs?.length || 0);
    if (recentCalcs && recentCalcs.length > 0) {
      recentCalcs.forEach((calc, i) => {
        console.log(`\n${i + 1}. Calculation ID: ${calc.id}`);
        console.log(`   Source: ${calc.source}`);
        console.log(`   Total emissions: ${calc.total_emissions} ${calc.emissions_unit}`);
        console.log(`   Activity data:`, JSON.stringify(calc.activity_data, null, 2));
      });
    }
  }
  
  console.log('\n🎯 RAG system test complete!');
}

async function checkDatabaseRecords() {
  console.log('🔍 Checking database records for source and unit issues...\n');
  
  // Check recent calculations
  console.log('📊 Recent calculations:');
  const { data: recentCalcs, error } = await supabase
    .from('emission_calc')
    .select('*')
    .order('calculated_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.log('❌ Database query error:', error);
  } else {
    console.log(`Found ${recentCalcs?.length || 0} recent calculations\n`);
    
    if (recentCalcs && recentCalcs.length > 0) {
      recentCalcs.forEach((calc, i) => {
        console.log(`${i + 1}. Calculation ID: ${calc.id}`);
        console.log(`   Method: ${calc.calculation_method}`);
        console.log(`   Source: ${calc.source}`);
        console.log(`   Total emissions: ${calc.total_emissions} ${calc.emissions_unit}`);
        console.log(`   Raw input: ${calc.raw_input || 'N/A'}`);
        
        if (calc.activity_data) {
          console.log(`   Activity data keys:`, Object.keys(calc.activity_data));
          console.log(`   Emission factor: ${calc.activity_data.emission_factor || 'N/A'}`);
          console.log(`   Emission factor unit: ${calc.activity_data.emission_factor_unit || 'N/A'}`);
          console.log(`   Factor details:`, calc.activity_data.factor_details || 'N/A');
        }
        console.log('');
      });
    }
  }
  
  // Look specifically for RAG calculations
  console.log('🤖 RAG-specific calculations:');
  const { data: ragCalcs, error: ragError } = await supabase
    .from('emission_calc')
    .select('*')
    .eq('calculation_method', 'RAG')
    .order('calculated_at', { ascending: false })
    .limit(3);
    
  if (ragError) {
    console.log('❌ RAG query error:', ragError);
  } else {
    console.log(`Found ${ragCalcs?.length || 0} RAG calculations`);
    
    if (ragCalcs && ragCalcs.length > 0) {
      ragCalcs.forEach((calc, i) => {
        console.log(`\nRAG ${i + 1}:`);
        console.log(`   ID: ${calc.id}`);
        console.log(`   Source: ${calc.source}`);
        console.log(`   Quantity: ${calc.activity_data?.quantity || 'N/A'} ${calc.activity_data?.unit || 'N/A'}`);
        console.log(`   Factor: ${calc.activity_data?.emission_factor || 'N/A'} ${calc.activity_data?.emission_factor_unit || 'N/A'}`);
        console.log(`   Total: ${calc.total_emissions} ${calc.emissions_unit}`);
        if (calc.activity_data?.factor_details) {
          console.log(`   Factor source: ${calc.activity_data.factor_details.source || 'N/A'}`);
          console.log(`   Factor description: ${calc.activity_data.factor_details.activity || 'N/A'}`);
        }
      });
    }
  }
}

testRAGSystem().catch(console.error);
checkDatabaseRecords().catch(console.error); 