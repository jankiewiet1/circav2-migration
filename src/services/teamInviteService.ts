import { supabase } from '@/integrations/supabase/client';

export interface TeamInviteRequest {
  inviterId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  companyId: string;
}

export interface TeamInviteResponse {
  success: boolean;
  message: string;
  data?: {
    invitationId: string;
    email: string;
    role: string;
    companyName: string;
  };
}

/**
 * Sends a team invitation using the Supabase edge function
 */
export async function sendTeamInvitation(request: TeamInviteRequest): Promise<TeamInviteResponse> {
  try {
    console.log('Sending team invitation:', request);

    const { data, error } = await supabase.functions.invoke('send-team-invite', {
      body: request
    });

    if (error) {
      console.error('Error invoking send-team-invite function:', error);
      throw new Error(error.message || 'Failed to send invitation');
    }

    console.log('Team invitation response:', data);
    return data;

  } catch (error) {
    console.error('Team invite service error:', error);
    
    // Return a structured error response
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send invitation'
    };
  }
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates role
 */
export function isValidRole(role: string): role is 'admin' | 'editor' | 'viewer' {
  return ['admin', 'editor', 'viewer'].includes(role);
} 