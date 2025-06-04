// Follow Deno deploy edge function format for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Send signup confirmation email function loaded");

const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { to, subject, data } = await req.json();
    
    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Recipient email (to) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Sending signup confirmation email to ${to}`);
    
    // Generate HTML email
    const html = generateHtmlEmail(data);
    
    // Add plain text version generator
    const plainTextEmail = generatePlainTextEmail(data);
    
    // Direct fetch to Resend API instead of using the package
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: 'Circa <info@circa.site>', // Using your verified domain
        to: [to],
        subject: subject || 'Welcome to Circa!',
        html: html,
        text: plainTextEmail
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', responseData);
      throw new Error('Failed to send email via Resend');
    }
    
    console.log('Email sent successfully:', responseData);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Signup confirmation email has been sent to ${to}`,
        emailId: responseData?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error sending signup email:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Create HTML email template for signup confirmation
function generateHtmlEmail(data) {
  const { name, company, calendlyUrl = "https://calendly.com/circa-info/30min" } = data;
  const logoUrl = "https://circa.site/circa-logo.png";
  const brandColor = "#10b981";

  return `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:0;margin:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#fff;border-radius:8px;box-shadow:0 2px 8px #0001;overflow:hidden;">
        <tr>
          <td style="background:${brandColor};padding:24px 0;text-align:center;">
            <img src="${logoUrl}" alt="Circa Logo" style="height:80px;margin-bottom:8px;" />
            <h1 style="color:#fff;font-size:28px;margin:0;">Welcome to Circa!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <p>Hello ${name || 'there'},</p>
            <p>Thank you for signing up with Circa! We're excited to have you on board.</p>
            ${company ? `<p>Company: <strong>${company}</strong></p>` : ''}
            
            <h2 style="color:${brandColor};font-size:22px;margin:32px 0 16px 0;">Next Steps</h2>
            <p>To help you get started with managing your carbon footprint:</p>
            <ul style="padding-left:20px;">
              <li style="margin-bottom:8px;">Complete your profile</li>
              <li style="margin-bottom:8px;">Upload your energy and travel data</li>
              <li style="margin-bottom:8px;">Explore your personalized dashboard</li>
            </ul>
            
            <div style="text-align:center;margin:32px 0 0 0;background:#f8fafc;padding:24px;border-radius:8px;">
              <p style="font-weight:600;margin-bottom:16px;">Want a personalized onboarding session? Our team is ready to assist you:</p>
              <a href="${calendlyUrl}" style="display:inline-block;background:${brandColor};color:#fff;font-weight:600;font-size:18px;padding:16px 32px;border-radius:6px;text-decoration:none;">Book Your Onboarding Call</a>
              <div style="margin-top:8px;font-size:13px;color:#64748b;">Let us show you how Circa can help your organization track and reduce its carbon footprint.</div>
            </div>
            
            <p style="margin-top:32px;">We're looking forward to helping you achieve your sustainability goals!</p>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;">
                  <div style="text-align:center;">
                    <img src="${logoUrl}" alt="Circa Logo" style="height:40px;" />
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#64748b;text-align:center;">
                  Carbon accounting made simple
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <div style="text-align:center;color:#64748b;font-size:12px;margin:24px 0;">&copy; ${new Date().getFullYear()} Circa. All rights reserved.</div>
    </div>
  `;
}

// Add plain text version generator
function generatePlainTextEmail(data) {
  const { name, company, calendlyUrl = "https://calendly.com/circa-info/30min" } = data;
  return `Welcome to Circa!

Hello ${name || 'there'},

Thank you for signing up with Circa! We're excited to have you on board.
${company ? `Company: ${company}\n` : ''}

Next Steps:
- Complete your profile
- Upload your energy and travel data
- Explore your personalized dashboard

Want a personalized onboarding session? Our team is ready to assist you:
Book Your Onboarding Call: ${calendlyUrl}

Let us show you how Circa can help your organization track and reduce its carbon footprint.

We're looking forward to helping you achieve your sustainability goals!

© ${new Date().getFullYear()} Circa. All rights reserved.
This email was sent to confirm your registration with Circa.`;
}

serve(handler); 