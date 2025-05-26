console.log("Edge Function started");

// Deno-compatible Climatiq API utility for batch emission calculations

// @ts-ignore: Deno global is available in Edge Functions
const CLIMATIQ_API_KEY = Deno.env.get('CLIMATIQ_API_KEY');
const CLIMATIQ_API_URL = 'https://api.climatiq.io';

if (!CLIMATIQ_API_KEY) {
  throw new Error('Missing CLIMATIQ_API_KEY in environment');
}

export async function climatiqBatchEstimate(batchRequests: any[]) {
  const response = await fetch(`${CLIMATIQ_API_URL}/data/v1/estimate/batch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip',
    },
    body: JSON.stringify(batchRequests),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Climatiq API error: ${error}`);
  }

  return await response.json();
} 