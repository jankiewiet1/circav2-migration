// First, let's create a dedicated API client for emissions

interface EmissionStatusResponse {
  total_entries: number;
  matched: number;
  unmatched: number;
  error?: string;
}

interface CalculationResponse {
  success: boolean;
  data: {
    total_entries: number;
    results: any[];
  };
}

export async function calculateEmissions(companyId: string, scope: string): Promise<CalculationResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/calculate-emissions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ company_id: companyId, scope }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to calculate emissions');
  }

  return response.json();
}

export async function getEmissionStatus(companyId: string, scope: string): Promise<EmissionStatusResponse> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_emission_calculation_status`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_company_id: companyId, p_scope: scope }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch emission status');
  }

  return response.json();
} 