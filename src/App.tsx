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
