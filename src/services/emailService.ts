// Email service for sending transactional emails using Resend
import { supabase } from '@/integrations/supabase/client';

/**
 * Sends a CO2 calculator summary email to a lead
 */
export async function sendCO2SummaryEmail(data: {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  summary: {
    totalCO2: number;
    totalCost: number;
    categoryResults: Array<{ category: string; total: number }>;
  };
}) {
  try {
    // Store the lead in the database first
    const { error: leadError } = await supabase.from('leads').insert({
      email: data.email,
      name: data.name || null,
      company: data.company || null,
      phone: data.phone || null,
      calculator_results: {
        summary: data.summary
      },
      status: 'new'
    });

    if (leadError) {
      console.error('Error saving lead:', leadError);
      throw new Error('Failed to save lead information');
    }

    // Call Supabase Edge Function to send the email
    const { error } = await supabase.functions.invoke('send-summary-email', {
      body: {
        to: data.email,
        subject: 'Your CO₂ Emission Summary from Circa',
        data: {
          name: data.name || 'there',
          company: data.company,
          totalCO2: data.summary.totalCO2.toFixed(2),
          totalCost: data.summary.totalCost.toFixed(2),
          categoryResults: data.summary.categoryResults,
          calendlyUrl: 'https://calendly.com/circa-demo/30min', // Update with your actual Calendly link
        }
      }
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

/**
 * Sends a sign-up confirmation email to a new user
 */
export async function sendSignUpConfirmationEmail(data: {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
}) {
  try {
    // Store the lead in the database first
    const { error: leadError } = await supabase.from('leads').insert({
      email: data.email,
      name: data.name || null,
      company: data.company || null,
      phone: data.phone || null,
      status: 'signup'
    });

    if (leadError) {
      console.error('Error saving lead:', leadError);
      throw new Error('Failed to save lead information');
    }

    // Call Supabase Edge Function to send the email
    const { error } = await supabase.functions.invoke('send-signup-email', {
      body: {
        to: data.email,
        subject: 'Welcome to Circa!',
        data: {
          name: data.name || 'there',
          company: data.company,
          calendlyUrl: 'https://calendly.com/circa-demo/30min', // Update with your actual Calendly link
        }
      }
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
} 