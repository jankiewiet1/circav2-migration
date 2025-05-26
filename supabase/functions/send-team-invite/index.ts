import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface TeamInviteRequest {
  inviterId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  companyId: string;
}

interface InviteLog {
  id?: string;
  inviter_id: string;
  email: string;
  role: string;
  company_id: string;
  timestamp: string;
}

class TeamInviteService {
  private supabase: any;
  private resendApiKey: string;

  constructor(supabaseClient: any, resendApiKey: string) {
    this.supabase = supabaseClient;
    this.resendApiKey = resendApiKey;
  }

  /**
   * Validates that the inviter is an admin in the company
   */
  async validateInviterPermissions(inviterId: string, companyId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('company_members')
        .select('role')
        .eq('user_id', inviterId)
        .eq('company_id', companyId)
        .single();

      if (error || !data) {
        console.error('Error validating inviter permissions:', error);
        return false;
      }

      return data.role === 'admin';
    } catch (error) {
      console.error('Error in validateInviterPermissions:', error);
      return false;
    }
  }

  /**
   * Checks if user is already invited or is a member
   */
  async checkExistingInviteOrMember(email: string, companyId: string): Promise<{ exists: boolean; type?: string }> {
    try {
      // First, check if user exists and get their ID
      const { data: userData } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      // If user exists, check if they're already a member
      if (userData) {
        const { data: memberData } = await this.supabase
          .from('company_members')
          .select('id')
          .eq('company_id', companyId)
          .eq('user_id', userData.id)
          .single();

        if (memberData) {
          return { exists: true, type: 'member' };
        }
      }

      // Check if already invited
      const { data: inviteData } = await this.supabase
        .from('company_invitations')
        .select('id')
        .eq('email', email)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .single();

      if (inviteData) {
        return { exists: true, type: 'invitation' };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking existing invite/member:', error);
      return { exists: false };
    }
  }

  /**
   * Creates invitation record in database
   */
  async createInvitation(inviterId: string, email: string, role: string, companyId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('company_invitations')
        .insert({
          company_id: companyId,
          email: email,
          role: role,
          invited_by: inviterId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create invitation: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Gets company and inviter information for email
   */
  async getInviteEmailData(inviterId: string, companyId: string): Promise<any> {
    try {
      // Get company information
      const { data: companyData, error: companyError } = await this.supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw new Error(`Failed to get company data: ${companyError.message}`);
      }

      // Get inviter information from profiles
      const { data: inviterData, error: inviterError } = await this.supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', inviterId)
        .single();

      if (inviterError) {
        console.warn('Could not get inviter profile, using fallback');
      }

      return {
        companyName: companyData?.name || 'Your Company',
        inviterName: inviterData ? `${inviterData.first_name} ${inviterData.last_name}`.trim() : 'A team member',
        inviterEmail: inviterData?.email || 'team@circa.site'
      };
    } catch (error) {
      console.error('Error getting invite email data:', error);
      // Return fallback data
      return {
        companyName: 'Your Company',
        inviterName: 'A team member',
        inviterEmail: 'team@circa.site'
      };
    }
  }

  /**
   * Generates HTML email template for team invitation
   */
  generateInviteHtml(data: {
    email: string;
    role: string;
    companyName: string;
    inviterName: string;
    inviterEmail: string;
  }): string {
    const { email, role, companyName, inviterName } = data;
    const logoUrl = "https://circa.site/lovable-uploads/7416a2f2-be9a-4bce-9909-6e9663491308.png";
    const brandColor = "#10b981";
    const acceptUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/accept-invite?email=${encodeURIComponent(email)}`;

    const roleDescriptions = {
      admin: 'full access to manage the company, team members, and all data',
      editor: 'access to view and edit emission data and reports',
      viewer: 'read-only access to view emission data and reports'
    };

    return `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:0;margin:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0001;overflow:hidden;">
          <tr>
            <td style="background:${brandColor};padding:24px 0;text-align:center;">
              <img src="${logoUrl}" alt="Circa Logo" style="height:80px;margin-bottom:8px;" />
              <h1 style="color:#fff;font-size:28px;margin:0;">You're Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="font-size:18px;margin-bottom:24px;">Hello there,</p>
              
              <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Circa, our carbon accounting platform.</p>
              
              <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:24px 0;">
                <h3 style="color:${brandColor};margin:0 0 12px 0;">Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</h3>
                <p style="margin:0;color:#64748b;">You'll have ${roleDescriptions[role] || 'access to the platform'}.</p>
              </div>
              
              <h2 style="color:${brandColor};font-size:22px;margin:32px 0 16px 0;">What is Circa?</h2>
              <p>Circa is a comprehensive carbon accounting platform that helps organizations:</p>
              <ul style="padding-left:20px;color:#64748b;">
                <li style="margin-bottom:8px;">Track and measure carbon emissions across all scopes</li>
                <li style="margin-bottom:8px;">Generate compliance reports and sustainability insights</li>
                <li style="margin-bottom:8px;">Set and monitor emission reduction targets</li>
                <li style="margin-bottom:8px;">Collaborate with team members on sustainability goals</li>
              </ul>
              
              <div style="text-align:center;margin:32px 0;">
                <a href="${acceptUrl}" style="display:inline-block;background:${brandColor};color:#fff;font-weight:600;font-size:18px;padding:16px 32px;border-radius:6px;text-decoration:none;">Accept Invitation</a>
              </div>
              
              <p style="margin-top:32px;color:#64748b;font-size:14px;">
                If you have any questions, feel free to reach out to ${inviterName} or our support team at 
                <a href="mailto:info@circa.site" style="color:${brandColor};">info@circa.site</a>
              </p>
              
              <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;">
                <p style="color:#64748b;font-size:13px;margin:0;">
                  This invitation was sent to ${email}. If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
        </table>
        <div style="text-align:center;color:#64748b;font-size:12px;margin:24px 0;">
          &copy; ${new Date().getFullYear()} Circa. All rights reserved.
        </div>
      </div>
    `;
  }

  /**
   * Generates plain text version of invitation email
   */
  generateInvitePlainText(data: {
    email: string;
    role: string;
    companyName: string;
    inviterName: string;
  }): string {
    const { email, role, companyName, inviterName } = data;
    const acceptUrl = `${Deno.env.get('FRONTEND_URL') || 'http://localhost:8080'}/accept-invite?email=${encodeURIComponent(email)}`;

    return `You're Invited to Join ${companyName} on Circa!

Hello there,

${inviterName} has invited you to join ${companyName} on Circa, our carbon accounting platform.

Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}

What is Circa?
Circa is a comprehensive carbon accounting platform that helps organizations:
- Track and measure carbon emissions across all scopes
- Generate compliance reports and sustainability insights
- Set and monitor emission reduction targets
- Collaborate with team members on sustainability goals

Accept your invitation: ${acceptUrl}

If you have any questions, feel free to reach out to ${inviterName} or our support team at info@circa.site

This invitation was sent to ${email}. If you weren't expecting this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Circa. All rights reserved.`;
  }

  /**
   * Sends invitation email using Resend API
   */
  async sendInvitationEmail(emailData: any): Promise<void> {
    try {
      const html = this.generateInviteHtml(emailData);
      const text = this.generateInvitePlainText(emailData);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Circa <info@circa.site>',
          to: [emailData.email],
          subject: `You've been invited to join ${emailData.companyName} on Circa`,
          html: html,
          text: text
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Resend API error:', responseData);
        throw new Error(`Failed to send email: ${responseData.message || response.statusText}`);
      }

      console.log('Invitation email sent successfully:', responseData);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }

  /**
   * Logs the invitation for tracking purposes
   */
  async logInvitation(inviteLog: InviteLog): Promise<void> {
    try {
      // For now, we'll use the company_invitations table as our log
      // In the future, you could create a separate invite_logs table
      console.log('Invitation logged:', inviteLog);
    } catch (error) {
      console.error('Error logging invitation:', error);
      // Don't throw here as this is not critical
    }
  }

  /**
   * Main function to send team invitation
   */
  async sendTeamInvite(request: TeamInviteRequest): Promise<{ success: boolean; message: string; data?: any }> {
    const { inviterId, email, role, companyId } = request;

    try {
      // Step 1: Validate inviter permissions
      console.log(`Validating inviter permissions for ${inviterId} in company ${companyId}`);
      const hasPermission = await this.validateInviterPermissions(inviterId, companyId);
      if (!hasPermission) {
        return {
          success: false,
          message: 'You do not have permission to invite team members. Only admins can send invitations.'
        };
      }

      // Step 2: Check for existing invitation or membership
      console.log(`Checking existing invitations/membership for ${email}`);
      const existingCheck = await this.checkExistingInviteOrMember(email, companyId);
      if (existingCheck.exists) {
        const message = existingCheck.type === 'member' 
          ? 'This user is already a member of your company.'
          : 'This user has already been invited and has a pending invitation.';
        return { success: false, message };
      }

      // Step 3: Create invitation record
      console.log(`Creating invitation record for ${email}`);
      const invitation = await this.createInvitation(inviterId, email, role, companyId);

      // Step 4: Get email data
      console.log('Getting email data for invitation');
      const emailData = await this.getInviteEmailData(inviterId, companyId);

      // Step 5: Send invitation email
      console.log(`Sending invitation email to ${email}`);
      await this.sendInvitationEmail({
        email,
        role,
        ...emailData
      });

      // Step 6: Log the invitation
      await this.logInvitation({
        inviter_id: inviterId,
        email,
        role,
        company_id: companyId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Invitation sent successfully to ${email}`,
        data: {
          invitationId: invitation.id,
          email,
          role,
          companyName: emailData.companyName
        }
      };

    } catch (error) {
      console.error('Error in sendTeamInvite:', error);
      return {
        success: false,
        message: `Failed to send invitation: ${error.message}`
      };
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Team Invite Function Started ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found');
      throw new Error('RESEND_API_KEY environment variable is not set');
    }

    const requestData: TeamInviteRequest = await req.json();
    console.log('Request data received:', requestData);
    
    // Validate required fields
    const { inviterId, email, role, companyId } = requestData;
    if (!inviterId || !email || !role || !companyId) {
      console.error('Missing required fields:', { inviterId: !!inviterId, email: !!email, role: !!role, companyId: !!companyId });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: inviterId, email, role, and companyId are required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      console.error('Invalid role:', role);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid role. Must be admin, editor, or viewer'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email format'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing team invite request: ${email} as ${role} to company ${companyId} by ${inviterId}`);

    const inviteService = new TeamInviteService(supabaseClient, resendApiKey);
    const result = await inviteService.sendTeamInvite(requestData);

    console.log('Team invite result:', result);

    const statusCode = result.success ? 200 : 400;

    return new Response(
      JSON.stringify(result),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Team invite function error:', error);
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