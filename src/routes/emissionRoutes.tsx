
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Scope1 from "@/pages/emissions/Scope1";
import Scope2 from "@/pages/emissions/Scope2";
import Scope3 from "@/pages/emissions/Scope3";
import ByCategory from "@/pages/emissions/ByCategory";
import Overview from "@/pages/emissions/Overview";

export const emissionRoutes = (
  <>
    <Route
      path="/emissions/scope1"
      element={
        <ProtectedRoute>
          <Scope1 />
        </ProtectedRoute>
      }
    />
    <Route
      path="/emissions/scope2"
      element={
        <ProtectedRoute>
          <Scope2 />
        </ProtectedRoute>
      }
    />
    <Route
      path="/emissions/scope3"
      element={
        <ProtectedRoute>
          <Scope3 />
        </ProtectedRoute>
      }
    />
    <Route
      path="/emissions/by-category"
      element={
        <ProtectedRoute>
          <ByCategory />
        </ProtectedRoute>
      }
    />
    <Route
      path="/emissions/overview"
      element={
        <ProtectedRoute>
          <Overview />
        </ProtectedRoute>
      }
    />
  </>
);
