// Simple debug script - copy and paste this into browser console
async function testCompanyMembers() {
  try {
    // Get current user
    const { data: { user } } = await window.supabase.auth.getUser();
    console.log('Current user:', user.id);
    
    // Get user's company membership
    const { data: membership } = await window.supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    const companyId = membership.company_id;
    console.log('Company ID:', companyId);
    
    // Test the exact same query as the app
    const { data: members, error } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', companyId);
    
    console.log('=== DIRECT QUERY RESULTS ===');
    console.log('Error:', error);
    console.log('Members found:', members?.length || 0);
    console.log('Members data:', members);
    
    // Test each member's profile
    if (members) {
      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        console.log(`\n--- Member ${i + 1} ---`);
        console.log('Member data:', member);
        
        const { data: profile, error: profileError } = await window.supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', member.user_id)
          .single();
        
        console.log('Profile data:', profile);
        console.log('Profile error:', profileError);
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

console.log('Run testCompanyMembers() to debug the issue'); 