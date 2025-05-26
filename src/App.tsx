import '@/styles/globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { publicRoutes } from "@/routes/publicRoutes";
import { companySetupRoutes } from "@/routes/companySetupRoutes";
import { emissionRoutes } from "@/routes/emissionRoutes";
import { mainRoutes } from "@/routes/mainRoutes";
import './i18n/i18n'; // Import initialized i18n
import { Analytics } from '@vercel/analytics/react';
import { useState, useEffect } from 'react';
import { ensureSupabaseInitialized } from './integrations/supabase/client';

import NotFound from "@/pages/NotFound";
import Index from "@/pages/Index";

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  
  // Initialize Supabase on app load to ensure sessions are ready
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { initialized } = await ensureSupabaseInitialized();
        setSupabaseInitialized(initialized);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        // Still set as initialized to not block the app, we'll handle auth errors later
        setSupabaseInitialized(true);
      }
    };
    
    initSupabase();
  }, []);
  
  if (!supabaseInitialized) {
    // Simple loading state while Supabase initializes
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              {publicRoutes}
              {companySetupRoutes}
              {mainRoutes}
              {emissionRoutes}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Analytics />
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
