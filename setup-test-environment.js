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

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';

async function setupTestEnvironment() {
  console.log('🚀 Setting up test environment step by step...\n');
  
  try {
    // Step 1: Create a test company
    console.log('1️⃣ Creating test company...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert({
        name: 'Test Company 2025',
        industry: 'Technology',
        country: 'Netherlands',
        city: 'Amsterdam',
        contact_name: 'Test Manager',
        contact_email: 'test@example.com',
        setup_completed: true
      })
      .select()
      .single();
    
    if (companyError) {
      console.error('❌ Error creating company:', companyError);
      return;
    }
    
    console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);

    // Step 2: Create test emission entries
    console.log('\n2️⃣ Creating test emission entries...');
    const testEntries = [
      {
        company_id: company.id,
        date: '2025-01-15',
        category: 'Purchased Electricity',
        description: 'Office electricity consumption',
        quantity: 2500,
        unit: 'kWh',
        scope: 2,
        match_status: 'unmatched',
        notes: 'Monthly office electricity consumption'
      },
      {
        company_id: company.id,
        date: '2025-01-20',
        category: 'Natural Gas',
        description: 'Natural gas for heating',
        quantity: 1200,
        unit: 'm3',
        scope: 1,
        match_status: 'unmatched',
        notes: 'Winter heating system'
      },
      {
        company_id: company.id,
        date: '2025-01-25',
        category: 'Business Travel',
        description: 'Business flight to London',
        quantity: 850,
        unit: 'km',
        scope: 3,
        match_status: 'unmatched',
        notes: 'Executive meeting travel'
      },
      {
        company_id: company.id,
        date: '2025-02-01',
        category: 'Company Vehicle',
        description: 'Fleet diesel consumption',
        quantity: 150,
        unit: 'liters',
        scope: 1,
        match_status: 'unmatched',
        notes: 'Monthly fleet fuel'
      },
      {
        company_id: company.id,
        date: '2025-02-05',
        category: 'Purchased Steam',
        description: 'District heating steam',
        quantity: 50,
        unit: 'GJ',
        scope: 2,
        match_status: 'unmatched',
        notes: 'Industrial process heating'
      }
    ];

    const { data: entries, error: entriesError } = await supabase
      .from('emission_entries')
      .insert(testEntries)
      .select();
    
    if (entriesError) {
      console.error('❌ Error creating entries:', entriesError);
      return;
    }
    
    console.log(`✅ Created ${entries.length} test emission entries`);
    entries.forEach((entry, i) => {
      console.log(`   ${i+1}. ${entry.description}: ${entry.quantity} ${entry.unit} (Scope ${entry.scope})`);
    });

    // Step 3: Test RAG calculation
    console.log('\n3️⃣ Testing RAG calculation system...');
    
    const testEntry = entries[0]; // Electricity entry
    console.log(`Testing with: ${testEntry.description} - ${testEntry.quantity} ${testEntry.unit}`);
    
    try {
      const ragResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/rag-emissions-calculator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          raw_input: `${testEntry.description} - ${testEntry.quantity} ${testEntry.unit}`,
          company_id: testEntry.company_id,
          entry_id: testEntry.id,
          demo_mode: false
        })
      });

      console.log(`RAG API Status: ${ragResponse.status}`);
      
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        console.log('✅ RAG Response:', {
          success: ragData.success,
          similarity_score: ragData.similarity_score,
          total_emissions: ragData.total_emissions,
          source: ragData.source,
          confidence_score: ragData.confidence_score
        });
        
        if (ragData.similarity_score >= 0.75) {
          console.log('✅ RAG calculation above threshold - would be accepted');
        } else {
          console.log('⚠️ RAG calculation below threshold - would fall back to OpenAI');
        }
      } else {
        const errorText = await ragResponse.text();
        console.log('❌ RAG failed:', errorText);
      }
    } catch (error) {
      console.log('❌ RAG test error:', error.message);
    }

    // Step 4: Test OpenAI calculation
    console.log('\n4️⃣ Testing OpenAI calculation system...');
    
    try {
      const openaiResponse = await fetch('https://vfdbyvnjhimmnbyhxyun.supabase.co/functions/v1/calculate-emissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          company_id: testEntry.company_id,
          entry_ids: [testEntry.id]
        })
      });

      console.log(`OpenAI API Status: ${openaiResponse.status}`);
      
      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json();
        console.log('✅ OpenAI Response:', {
          calculated: openaiData.calculated,
          failed: openaiData.failed,
          results: openaiData.results
        });
      } else {
        const errorText = await openaiResponse.text();
        console.log('❌ OpenAI failed:', errorText);
      }
    } catch (error) {
      console.log('❌ OpenAI test error:', error.message);
    }

    // Step 5: Check final database state
    console.log('\n5️⃣ Checking final database state...');
    
    const { data: finalEntries } = await supabase
      .from('emission_entries')
      .select(`
        *,
        emission_calc(*)
      `)
      .eq('company_id', company.id);
    
    if (finalEntries) {
      finalEntries.forEach((entry) => {
        const hasCalc = entry.emission_calc && entry.emission_calc.length > 0;
        console.log(`📊 ${entry.description}: ${hasCalc ? 'CALCULATED' : 'PENDING'}`);
        if (hasCalc) {
          entry.emission_calc.forEach((calc) => {
            console.log(`   ${calc.calculation_method}: ${calc.total_emissions} kg CO2e`);
          });
        }
      });
    }

    // Step 6: Provide next steps
    console.log('\n6️⃣ Next Steps:');
    console.log('1. Open the application in your browser');
    console.log('2. Navigate to Data Traceability page');
    console.log('3. You should see the test data created');
    console.log('4. Try running calculations to test the system');
    console.log(`5. Company ID to use: ${company.id}`);

  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupTestEnvironment().catch(console.error); 