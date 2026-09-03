import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { KeywordPage } from "../features/keywords/KeywordPage.jsx";
import { SeoDashboardPage } from "../features/seo-dashboard/SeoDashboardPage.jsx";
import { TechnicalAuditPage } from "../features/audits/TechnicalAuditPage.jsx";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keywords"
          element={
            <ProtectedRoute>
              <KeywordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/seo-dashboard"
          element={
            <ProtectedRoute>
              <SeoDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audits"
          element={
            <ProtectedRoute>
              <TechnicalAuditPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
