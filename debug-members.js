// Run this in the browser console to debug company members
async function debugCompanyMembers() {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found:', userError);
      return;
    }
    
    console.log('Current user:', user.id, user.email);
    
    // Get user's company
    const { data: membershipData, error: membershipError } = await window.supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (membershipError || !membershipData) {
      console.error('User not part of any company:', membershipError);
      return;
    }
    
    const companyId = membershipData.company_id;
    console.log('Company ID:', companyId);
    
    // Get all company members directly from database
    const { data: allMembers, error: membersError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId);
    
    console.log('=== ALL COMPANY MEMBERS FROM DATABASE ===');
    console.log('Total members found:', allMembers?.length || 0);
    console.log('Members data:', allMembers);
    
    // Check profiles for each member
    if (allMembers && allMembers.length > 0) {
      console.log('\n=== CHECKING PROFILES FOR EACH MEMBER ===');
      
      for (const member of allMembers) {
        console.log(`\nMember ID: ${member.id}, User ID: ${member.user_id}, Role: ${member.role}`);
        
        const { data: profile, error: profileError } = await window.supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single();
        
        if (profileError) {
          console.log(`❌ Profile error for ${member.user_id}:`, profileError);
        } else {
          console.log(`✅ Profile found for ${member.user_id}:`, profile);
        }
      }
    }
    
    // Test the getCompanyMembers function directly
    console.log('\n=== TESTING getCompanyMembers FUNCTION ===');
    try {
      // We need to simulate the function call since it's not directly available
      const response = await fetch('/api/company-members?companyId=' + companyId);
      if (response.ok) {
        const result = await response.json();
        console.log('API response:', result);
      } else {
        console.log('API call failed, testing direct database query instead');
        
        // Direct test of the logic
        const { data: testMembers, error: testError } = await window.supabase
          .from('company_members')
          .select('*')
          .eq('company_id', companyId);
        
        if (testError) {
          console.error('Test query error:', testError);
          return;
        }
        
        console.log('Test members query result:', testMembers);
        
        // Test profile fetching for each
        const processedMembers = [];
        for (const member of testMembers || []) {
          const { data: profileData, error: profileError } = await window.supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', member.user_id)
            .single();
          
          const processedMember = {
            id: member.id,
            user_id: member.user_id,
            company_id: member.company_id,
            role: member.role,
            firstName: profileData?.first_name || '',
            lastName: profileData?.last_name || '',
            email: profileData?.email || 'No email found',
            joinedAt: member.joined_at,
            profileError: profileError ? profileError.message : null
          };
          
          processedMembers.push(processedMember);
          console.log('Processed member:', processedMember);
        }
        
        console.log('Final processed members:', processedMembers);
        console.log('Total processed:', processedMembers.length);
      }
    } catch (apiError) {
      console.error('Error testing function:', apiError);
    }
    
  } catch (error) {
    console.error('Error in debug function:', error);
  }
}

console.log('=== Company Members Debug Tool ===');
console.log('Run debugCompanyMembers() to check company members data'); 