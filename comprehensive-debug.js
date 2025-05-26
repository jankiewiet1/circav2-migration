// Comprehensive debug script for company members issue
async function comprehensiveDebug() {
  try {
    console.log('=== COMPREHENSIVE COMPANY MEMBERS DEBUG ===');
    
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    console.log('1. Current user:', user.id, user.email);
    
    // Check all company memberships for this user
    console.log('\n2. Checking ALL company memberships for current user...');
    const { data: allMemberships, error: membershipError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('user_id', user.id);
    
    console.log('All memberships:', allMemberships);
    console.log('Membership error:', membershipError);
    
    if (!allMemberships || allMemberships.length === 0) {
      console.error('❌ No company memberships found for current user!');
      return;
    }
    
    const companyId = allMemberships[0].company_id;
    console.log('3. Using company ID:', companyId);
    
    // Check ALL members in this company (without filters)
    console.log('\n4. Checking ALL members in company (no user filter)...');
    const { data: allCompanyMembers, error: allMembersError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId);
    
    console.log('All company members:', allCompanyMembers);
    console.log('All members error:', allMembersError);
    console.log('Total members in company:', allCompanyMembers?.length || 0);
    
    // Check if RLS is affecting the query
    console.log('\n5. Testing RLS policies...');
    
    // Try with different approaches
    console.log('\n6. Testing different query approaches...');
    
    // Approach 1: Basic query
    const { data: basic, error: basicError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId);
    console.log('Basic query result:', basic?.length, basic);
    
    // Approach 2: With specific columns
    const { data: specific, error: specificError } = await window.supabase
      .from('company_members')
      .select('id, user_id, company_id, role, joined_at')
      .eq('company_id', companyId);
    console.log('Specific columns result:', specific?.length, specific);
    
    // Approach 3: Check if there are any filters being applied
    const { data: noFilter, error: noFilterError } = await window.supabase
      .from('company_members')
      .select('*');
    console.log('No filter query (all records):', noFilter?.length);
    
    // Check profiles for each member found
    if (allCompanyMembers && allCompanyMembers.length > 0) {
      console.log('\n7. Checking profiles for each member...');
      for (const member of allCompanyMembers) {
        console.log(`\nMember ${member.id}:`);
        console.log('- User ID:', member.user_id);
        console.log('- Role:', member.role);
        
        const { data: profile, error: profileError } = await window.supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single();
        
        console.log('- Profile:', profile);
        console.log('- Profile error:', profileError);
      }
    }
    
    // Check the exact query the app is using
    console.log('\n8. Testing exact app query...');
    const { data: appQuery, error: appError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId);
    
    console.log('App query result:', appQuery);
    console.log('App query error:', appError);
    console.log('App query count:', appQuery?.length || 0);
    
  } catch (error) {
    console.error('Comprehensive debug error:', error);
  }
}

console.log('Run comprehensiveDebug() to get detailed analysis'); 