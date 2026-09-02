import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { KeywordPage } from "../features/keywords/KeywordPage.jsx";

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
      </Routes>
    </AuthProvider>
  );
}
