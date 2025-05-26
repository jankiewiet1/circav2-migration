// Run this in the browser console while logged in to the app
// This will fix missing profiles for all company members

async function fixCompanyMemberProfiles() {
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
    
    console.log('User company ID:', membershipData.company_id);
    
    // Get all company members
    const { data: companyMembers, error: membersError } = await window.supabase
      .from('company_members')
      .select('*')
      .eq('company_id', membershipData.company_id);
    
    if (membersError) {
      console.error('Error fetching company members:', membersError);
      return;
    }
    
    console.log('Company members found:', companyMembers?.length || 0);
    
    // Check and fix profiles for each member
    for (const member of companyMembers || []) {
      console.log(`\nChecking member: ${member.user_id}`);
      
      // Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', member.user_id)
        .single();
      
      if (profileCheckError && profileCheckError.code === 'PGRST116') {
        console.log(`No profile found for ${member.user_id}, creating one...`);
        
        // Get user data from auth
        const { data: authUserData, error: authError } = await window.supabase.auth.admin.getUserById(member.user_id);
        
        if (authError) {
          console.error(`Error getting auth data for ${member.user_id}:`, authError);
          continue;
        }
        
        // Create profile
        const profileData = {
          id: member.user_id,
          first_name: authUserData?.user?.user_metadata?.first_name || '',
          last_name: authUserData?.user?.user_metadata?.last_name || '',
          email: authUserData?.user?.email || '',
          created_at: new Date().toISOString()
        };
        
        console.log('Creating profile with data:', profileData);
        
        const { data: insertedProfile, error: profileError } = await window.supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();
        
        if (profileError) {
          console.error(`Error creating profile for ${member.user_id}:`, profileError);
        } else {
          console.log(`Profile created successfully for ${member.user_id}:`, insertedProfile);
        }
      } else if (existingProfile) {
        console.log(`Profile exists for ${member.user_id}:`, existingProfile);
      } else {
        console.error(`Error checking profile for ${member.user_id}:`, profileCheckError);
      }
    }
    
    console.log('\n=== Profile fix complete ===');
    console.log('Refreshing page to reload data...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Error fixing company member profiles:', error);
  }
}

// Also keep the original function for fixing current user
async function fixCurrentUser() {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found:', userError);
      return;
    }
    
    console.log('Current user:', user.id, user.email);
    
    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('Existing profile check:', { existingProfile, error: profileCheckError });
    
    if (!existingProfile) {
      console.log('Creating profile for user...');
      
      // Create profile
      const profileData = {
        id: user.id,
        first_name: user.user_metadata?.first_name || 'Jan',
        last_name: user.user_metadata?.last_name || 'de Jonge',
        email: user.email,
        created_at: new Date().toISOString()
      };
      
      console.log('Profile data to insert:', profileData);
      
      const { data: insertedProfile, error: profileError } = await window.supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log('Profile created successfully:', insertedProfile);
      }
    } else {
      console.log('Profile already exists');
    }
    
    // Refresh the page to reload data
    console.log('Refreshing page to reload data...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('Error fixing user:', error);
  }
}

// Run the company member profile fix
console.log('=== Starting Company Member Profile Fix ===');
console.log('Run fixCompanyMemberProfiles() to fix all company member profiles');
console.log('Run fixCurrentUser() to fix just the current user profile'); 