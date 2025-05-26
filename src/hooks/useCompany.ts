import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Company {
  id: string;
  name: string;
  industry?: string;
  contact_name?: string;
  contact_email?: string;
  contact_title?: string;
  created_at: string;
  updated_at?: string;
  // Add any other fields that exist in your companies table
}

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const fetchCompany = async () => {
    try {
      setLoading(true);
      
      if (!session?.user?.id) {
        setCompany(null);
        return;
      }

      // Get the company associated with the current user
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by_user_id', session.user.id)
        .single();

      if (error) throw error;
      
      setCompany(data as Company);
    } catch (err: any) {
      console.error('Error fetching company:', err);
      setError(new Error(err.message || 'Failed to fetch company'));
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [session?.user?.id]);

  return {
    company,
    loading,
    error,
    refetch: fetchCompany
  };
} 