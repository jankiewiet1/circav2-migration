import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function Callback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only run on client
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        navigate('/auth/login', { state: { error: 'Authentication failed. Please try again.' } });
        return;
      }
      // Redirect to dashboard on success
      navigate('/dashboard');
    };
    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-circa-green-light">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Completing authentication...</h2>
        <p className="mt-2 text-gray-600">Please wait while we verify your account.</p>
      </div>
    </div>
  );
} 