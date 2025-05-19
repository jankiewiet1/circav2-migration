import { supabase } from '@/integrations/supabase/client';
import { UserRole, CompanyFormValues, Company, CompanyMember } from '@/types';
import { toast } from 'sonner';

// Create company service
export const createCompanyService = async (name: string, industry: string, userId: string) => {
  try {
    const { data, error } = await supabase.from('companies').insert({
      name,
      industry,
      created_by_user_id: userId,
      setup_completed: false
    }).select().single();
    
    if (error) throw error;
    
    // Add the creator as an admin member
    const { error: memberError } = await supabase.from('company_members').insert({
      company_id: data.id,
      user_id: userId,
      role: 'admin',
      joined_at: new Date().toISOString()
    });
    
    if (memberError) throw memberError;
    
    return { company: data as Company, error: null };
  } catch (error: any) {
    console.error('Error creating company:', error);
    return { company: null, error };
  }
};

// Update company service
export const updateCompanyService = async (companyId: string, data: Partial<Company>) => {
  try {
    const { error } = await supabase
      .from('companies')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', companyId);
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating company:', error);
    return { error };
  }
};

// Fetch company data service
export const fetchCompanyDataService = async (userId: string) => {
  try {
    // Get company membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', userId)
      .single();
    
    if (membershipError && membershipError.code !== 'PGRST116') {
      throw membershipError;
    }
    
    if (!membershipData) {
      return { company: null, members: [], userRole: null, error: null };
    }
    
    // Get company details
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', membershipData.company_id)
      .single();
    
    if (companyError) throw companyError;
    
    // Get company members
    const { data: membersData, error: membersError } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', membershipData.company_id);
    
    if (membersError) throw membersError;
    
    // Format members data - without profile info for now
    const members: CompanyMember[] = (membersData || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      company_id: member.company_id,
      role: member.role as UserRole,
      firstName: '',
      lastName: '',
      email: '',
      joinedAt: member.joined_at,
    }));
    
    // Get user profiles for members
    for (let i = 0; i < members.length; i++) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', members[i].user_id)
          .single();
          
        if (profileData && typeof profileData === 'object') {
          members[i].firstName = profileData.first_name || '';
          members[i].lastName = profileData.last_name || '';
          members[i].email = profileData.email || '';
        }
      } catch (profileError) {
        console.error(`Error fetching profile for member ${members[i].user_id}:`, profileError);
        // Continue with the next member
      }
    }
    
    return {
      company: companyData as Company,
      members,
      userRole: membershipData.role as UserRole,
      error: null
    };
  } catch (error: any) {
    console.error('Error fetching company data:', error);
    return { company: null, members: [], userRole: null, error };
  }
};

// Invite member service
export const inviteMemberService = async (
  companyId: string,
  email: string,
  role: UserRole,
  invitedBy: string
) => {
  try {
    const { error } = await supabase.from('company_invitations').insert({
      company_id: companyId,
      email,
      role,
      invited_by: invitedBy,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error inviting member:', error);
    return { error };
  }
};

// Update member role service
export const updateMemberRoleService = async (memberId: string, role: UserRole) => {
  try {
    const { error } = await supabase
      .from('company_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return { error };
  }
};

// Remove member service
export const removeMemberService = async (memberId: string) => {
  try {
    const { error } = await supabase
      .from('company_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
    
    return { error: null };
  } catch (error: any) {
    console.error('Error removing member:', error);
    return { error };
  }
};

// Create company invitation
export const createCompanyInvitation = async (
  companyId: string,
  email: string,
  role: UserRole,
  invitedBy: string
): Promise<any> => {
  try {
    const { data, error } = await supabase.from('company_invitations').insert({
      company_id: companyId,
      email,
      role,
      invited_by: invitedBy,
      status: 'pending'
    }).select();

    if (error) throw error;
    return data[0];
  } catch (error: any) {
    console.error('Error creating company invitation:', error);
    throw error;
  }
};

// Get company members
export const getCompanyMembers = async (companyId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('company_members')
      .select('*, profiles:user_id(first_name, last_name, email)')
      .eq('company_id', companyId);

    if (error) throw error;

    return (data || []).map(member => ({
      id: member.id,
      role: member.role,
      firstName: member.profiles?.first_name || '',
      lastName: member.profiles?.last_name || '',
      email: member.profiles?.email || '',
      joinedAt: member.joined_at
    }));
  } catch (error: any) {
    console.error('Error fetching company members:', error);
    throw error;
  }
};

// Update company member role
export const updateCompanyMemberRole = async (memberId: string, role: UserRole): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_members')
      .update({ role })
      .eq('id', memberId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating member role:', error);
    throw error;
  }
};

// Delete company member
export const deleteCompanyMember = async (memberId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting company member:', error);
    throw error;
  }
};

// Get company invitations
export const getCompanyInvitations = async (companyId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching company invitations:', error);
    throw error;
  }
};

// Resend company invitation
export const resendCompanyInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_invitations')
      .update({ created_at: new Date().toISOString() })
      .eq('id', invitationId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    throw error;
  }
};

// Delete company invitation
export const deleteCompanyInvitation = async (invitationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('company_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting invitation:', error);
    throw error;
  }
};
