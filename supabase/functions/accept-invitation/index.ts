import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface AcceptInvitationRequest {
  userId: string;
  invitationId: string;
  companyId: string;
  role: string;
}

interface FixUserRequest {
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Create Supabase client with service role for bypassing RLS
    const supabaseServiceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle fix-user action for existing users missing profiles
    if (action === 'fix-user') {
      console.log('=== Fix User Action Started ===');
      
      const requestData: FixUserRequest = await req.json();
      const { userId } = requestData;
      
      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Missing userId'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user data from auth
      const { data: authUserData, error: authError } = await supabaseServiceRole.auth.admin.getUserById(userId);
      
      if (authError || !authUserData?.user) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'User not found in auth'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if profile exists
      const { data: existingProfile } = await supabaseServiceRole
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        // Create profile - only use columns that exist in the profiles table
        const profileData = {
          id: userId,
          first_name: authUserData.user.user_metadata?.first_name || '',
          last_name: authUserData.user.user_metadata?.last_name || '',
          email: authUserData.user.email || '',
          created_at: new Date().toISOString()
        };

        const { data: insertedProfile, error: profileError } = await supabaseServiceRole
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (profileError) {
          return new Response(
            JSON.stringify({
              success: false,
              message: 'Failed to create profile',
              error: profileError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Profile created:', insertedProfile);
      }

      // Confirm email if not confirmed
      const { data: confirmData, error: confirmError } = await supabaseServiceRole.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error('Error confirming email:', confirmError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User fixed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original accept invitation logic
    console.log('=== Accept Invitation Function Started ===');

    const requestData: AcceptInvitationRequest = await req.json();
    console.log('Request data received:', JSON.stringify(requestData, null, 2));
    
    const { userId, invitationId, companyId, role } = requestData;

    // Validate required fields
    if (!userId || !invitationId || !companyId || !role) {
      console.error('Missing required fields:', { userId: !!userId, invitationId: !!invitationId, companyId: !!companyId, role: !!role });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verify the invitation exists and is pending
    console.log('Step 1: Checking invitation...');
    const { data: invitation, error: invitationError } = await supabaseServiceRole
      .from('company_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    console.log('Invitation query result:', { invitation, error: invitationError });

    if (invitationError || !invitation) {
      console.error('Invalid or expired invitation:', invitationError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid or expired invitation'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if user is already a member
    console.log('Step 2: Checking existing membership...');
    const { data: existingMember, error: memberCheckError } = await supabaseServiceRole
      .from('company_members')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    console.log('Existing member check:', { existingMember, error: memberCheckError });

    if (existingMember) {
      console.log('User is already a member');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User is already a member of this company'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Wait for user to be available in auth.users and get user data
    console.log('Step 3: Waiting for user to be available...');
    
    let authUserData = null;
    let retryCount = 0;
    const maxRetries = 10; // Increased retries
    
    while (!authUserData && retryCount < maxRetries) {
      console.log(`Checking if user exists in auth.users (attempt ${retryCount + 1}/${maxRetries})...`);
      
      const { data: userData, error: authUserError } = await supabaseServiceRole.auth.admin.getUserById(userId);
      
      if (userData && userData.user) {
        console.log('User found in auth.users:', userData.user.id);
        authUserData = userData;
      } else {
        console.log('User not yet available in auth.users, waiting...', authUserError);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      }
    }
    
    if (!authUserData) {
      console.error('User not found in auth.users after retries');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User account not ready. Please try again in a moment.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Create profile record if it doesn't exist
    console.log('Step 4: Creating profile record...');
    const { data: existingProfile } = await supabaseServiceRole
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!existingProfile) {
      console.log('Creating profile record for user...');
      
      // Only use columns that exist in the profiles table
      const profileData = {
        id: userId,
        first_name: authUserData?.user?.user_metadata?.first_name || '',
        last_name: authUserData?.user?.user_metadata?.last_name || '',
        email: authUserData?.user?.email || '',
        created_at: new Date().toISOString()
      };
      
      console.log('Profile data to insert:', JSON.stringify(profileData, null, 2));
      
      const { data: insertedProfile, error: profileError } = await supabaseServiceRole
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      
      console.log('Profile insertion result:', { insertedProfile, error: profileError });
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to create user profile',
            error: profileError.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('Profile already exists for user');
    }
    
    // 5. Confirm the user's email (since they accepted the invitation)
    console.log('Step 5: Confirming user email...');
    const { data: confirmData, error: confirmError } = await supabaseServiceRole.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );
    
    console.log('Email confirmation result:', { confirmData, error: confirmError });
    
    if (confirmError) {
      console.error('Error confirming email:', confirmError);
      // Don't fail the request, but log the error
    }
    
    // 6. Add user to company members
    console.log('Step 6: Adding user to company members...');
    const memberData = {
      user_id: userId,
      company_id: companyId,
      role: role,
      joined_at: new Date().toISOString()
    };
    console.log('Member data to insert:', JSON.stringify(memberData, null, 2));

    const { data: insertedMember, error: memberError } = await supabaseServiceRole
      .from('company_members')
      .insert(memberData)
      .select()
      .single();

    console.log('Member insertion result:', { insertedMember, error: memberError });

    if (memberError) {
      console.error('Error adding user to company members:', memberError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to add user to company',
          error: memberError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Update invitation status to accepted
    console.log('Step 7: Updating invitation status...');
    const { data: updatedInvitation, error: updateError } = await supabaseServiceRole
      .from('company_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)
      .select()
      .single();

    console.log('Invitation update result:', { updatedInvitation, error: updateError });

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
      // Don't fail the request for this, but log it
    }

    console.log('Successfully accepted invitation and added user to company');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation accepted successfully',
        data: {
          member: insertedMember,
          invitation: updatedInvitation
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Accept invitation function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 