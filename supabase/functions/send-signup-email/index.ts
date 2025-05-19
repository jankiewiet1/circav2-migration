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
        html: html
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
  const { name, company, calendlyUrl } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
        .content { background-color: #f8fafc; padding: 20px; border-radius: 0 0 4px 4px; }
        .footer { margin-top: 20px; font-size: 12px; color: #64748b; text-align: center; }
        .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Circa!</h1>
        </div>
        <div class="content">
          <p>Hello ${name || 'there'},</p>
          
          <p>Thank you for signing up with Circa! We're excited to have you on board.</p>
          
          ${company ? `<p>Company: <strong>${company}</strong></p>` : ''}
          
          <h2>Next Steps</h2>
          <p>To help you get started with managing your carbon footprint:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Upload your energy and travel data</li>
            <li>Explore your personalized dashboard</li>
          </ul>
          
          <p>Want a personalized onboarding session? Our team is ready to assist you:</p>
          
          <a href="${calendlyUrl || 'https://calendly.com/circa-demo/30min'}" class="button">Schedule an Onboarding Call</a>
          
          <p>We're looking forward to helping you achieve your sustainability goals!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Circa. All rights reserved.</p>
          <p>This email was sent to confirm your registration with Circa.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler); 