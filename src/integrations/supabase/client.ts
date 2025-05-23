// integrations/supabase/client.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase project credentials
const SUPABASE_URL = "https://vfdbyvnjhimmnbyhxyun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2Mzk2MTQsImV4cCI6MjA2MDIxNTYxNH0.DC5NE2wi8_i24-jx1Uignlem0HL2h4ocZ8OsJD_qeiU";

// Create the Supabase client
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'supabase.auth.token',
      detectSessionInUrl: true, // Detect session in URL for SSO login flows
    },
    global: {
      headers: {
        'x-client-info': 'circav2',
      },
      // Add fetch options with better timeout and retry mechanism
      fetch: (url, options) => {
        return fetchWithRetry(url, options, 3);
      },
    },
  }
);

// Helper for fetch with retries to handle network issues
async function fetchWithRetry(url: RequestInfo, options: RequestInit | undefined, retries: number): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      // Increase timeout to 30 seconds
      signal: options?.signal || AbortSignal.timeout(30000),
    });
    
    // If unauthorized and we have a session, try refreshing the session
    if (response.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase.auth.refreshSession();
        // If refreshed successfully, retry the request once more
        if (!error) {
          console.log('Session refreshed, retrying request');
          return fetch(url, options);
        }
      }
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Request failed, retrying (${retries} attempts left)...`);
      // Exponential backoff - wait longer between retries
      await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    // Create a synthetic response to avoid hard failures
    console.error('Request failed after retries:', error);
    return new Response(
      JSON.stringify({ error: 'Request failed after multiple attempts' }), 
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Add initialization check
export const ensureSupabaseInitialized = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Supabase session error:', error.message);
      // Try to recover anonymous session
      await supabase.auth.signInAnonymously();
    }
    return { initialized: true };
  } catch (e) {
    console.error('Supabase initialization error:', e);
    return { initialized: false, error: e };
  }
};
