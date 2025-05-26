
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CompanySetup from "@/pages/company/CompanySetup";
import CompanyInfo from "@/pages/company/setup/CompanyInfo";
import CompanyTeam from "@/pages/company/setup/CompanyTeam";
import CompanyPreferences from "@/pages/company/setup/CompanyPreferences";

export const companySetupRoutes = (
  <>
    <Route
      path="/company/setup"
      element={
        <ProtectedRoute requireCompany={false}>
          <CompanySetup />
        </ProtectedRoute>
      }
    />
    <Route
      path="/company/setup/info"
      element={
        <ProtectedRoute requireCompany={false}>
          <CompanyInfo />
        </ProtectedRoute>
      }
    />
    <Route
      path="/company/setup/team"
      element={
        <ProtectedRoute>
          <CompanyTeam />
        </ProtectedRoute>
      }
    />
    <Route
      path="/company/setup/preferences"
      element={
        <ProtectedRoute>
          <CompanyPreferences />
        </ProtectedRoute>
      }
    />
  </>
);
