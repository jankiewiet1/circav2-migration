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
  const { name, company } = data;
  const logoUrl = "https://circa.site/lovable-uploads/7416a2f2-be9a-4bce-9909-6e9663491308.png";
  const brandColor = "#10b981";
  const calendlyUrl = "https://calendly.com/circa-info/30min";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', Arial, sans-serif; line-height: 1.6; color: #334155; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; }
        .header { background-color: ${brandColor}; color: white; padding: 32px 0 24px 0; border-radius: 8px 8px 0 0; text-align: center; }
        .logo { height: 80px; margin-bottom: 8px; }
        .content { padding: 32px 24px; }
        .button { display: inline-block; background-color: ${brandColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600; margin-top: 24px; }
        .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="Circa Logo" class="logo" />
          <h1 style="margin:0;font-size:28px;">Welcome to Circa!</h1>
        </div>
        <div class="content">
          <p>Hello ${name || 'there'},</p>
          <p>Thank you for signing up with Circa! We're excited to have you on board.</p>
          ${company ? `<p>Company: <strong>${company}</strong></p>` : ''}
          <h2 style="color:${brandColor};font-size:22px;margin:32px 0 16px 0;">Next Steps</h2>
          <ul>
            <li>Complete your profile</li>
            <li>Upload your energy and travel data</li>
            <li>Explore your personalized dashboard</li>
          </ul>
          <div style="text-align:center;margin:32px 0 0 0;">
            <a href="${calendlyUrl}" class="button">Book Your Onboarding Call</a>
            <div style="margin-top:8px;font-size:13px;color:#64748b;">Let us show you how Circa can help your organization track and reduce its carbon footprint.</div>
          </div>
          <p style="margin-top:32px;">We're looking forward to helping you achieve your sustainability goals!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Circa. All rights reserved.</p>
          <p>This email was sent to confirm your registration with Circa.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Add plain text version generator
function generatePlainTextEmail(data) {
  const { name, company } = data;
  return `Welcome to Circa!\n\nHello ${name || 'there'},\n\nThank you for signing up with Circa! We're excited to have you on board.\n${company ? `Company: ${company}\n` : ''}\nNext Steps:\n- Complete your profile\n- Upload your energy and travel data\n- Explore your personalized dashboard\n\nBook your onboarding call: https://calendly.com/circa-info/30min\nLet us show you how Circa can help your organization track and reduce its carbon footprint.\n\nWe're looking forward to helping you achieve your sustainability goals!\n\n© ${new Date().getFullYear()} Circa. All rights reserved.\nThis email was sent to confirm your registration with Circa.`;
}

serve(handler); 