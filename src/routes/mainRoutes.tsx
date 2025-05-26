import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/Reports";
import DataUpload from "@/pages/DataUpload";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import CompanyManage from "@/pages/company/CompanyManage";
import CompanyPreferences from "@/pages/company/setup/CompanyPreferences";

export const mainRoutes = (
  <>
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reports"
      element={
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      }
    />
    <Route
      path="/data-upload"
      element={
        <ProtectedRoute>
          <DataUpload />
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      }
    />
    <Route
      path="/company/manage"
      element={
        <ProtectedRoute>
          <CompanyManage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/company/preferences"
      element={
        <ProtectedRoute>
          <CompanyPreferences />
        </ProtectedRoute>
      }
    />
  </>
);
