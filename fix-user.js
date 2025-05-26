// Fix existing user script
const SUPABASE_URL = 'https://vfdbyvnjhimmnbyhxyun.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZGJ5dm5qaGltbW5ieWh4eXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0NTQ5MTYsImV4cCI6MjAyOTAzMDkxNn0.cwBbk2tq-fUcKF1S0jVKkOAG2FIQSID7Jjvff5Do99Y';

async function fixUser() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/accept-invitation?action=fix-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userId: 'e6238de5-c001-4c3f-8f04-8e9c3ba321e'
      })
    });

    const result = await response.json();
    console.log('Fix user result:', result);
  } catch (error) {
    console.error('Error fixing user:', error);
  }
}

fixUser(); 