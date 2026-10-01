import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthProvider.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";

const ClientsPage = lazy(() => import("../features/clients/ClientsPage.jsx").then((module) => ({ default: module.ClientsPage })));
const WebsitesPage = lazy(() => import("../features/websites/WebsitesPage.jsx").then((module) => ({ default: module.WebsitesPage })));
const KeywordPage = lazy(() => import("../features/keywords/KeywordPage.jsx").then((module) => ({ default: module.KeywordPage })));
const SeoDashboardPage = lazy(() => import("../features/seo-dashboard/SeoDashboardPage.jsx").then((module) => ({ default: module.SeoDashboardPage })));
const TechnicalAuditPage = lazy(() => import("../features/audits/TechnicalAuditPage.jsx").then((module) => ({ default: module.TechnicalAuditPage })));
const TasksPage = lazy(() => import("../features/tasks/TasksPage.jsx").then((module) => ({ default: module.TasksPage })));
const ClientPortalPage = lazy(() => import("../features/reports/ClientPortalPage.jsx").then((module) => ({ default: module.ClientPortalPage })));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage.jsx").then((module) => ({ default: module.ReportsPage })));
const AiWorkspacePage = lazy(() => import("../features/ai/AiWorkspacePage.jsx").then((module) => ({ default: module.AiWorkspacePage })));

export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<main className="route-loading">Loading workspace...</main>}><Routes>
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
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/websites"
          element={
            <ProtectedRoute>
              <WebsitesPage />
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
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/portal" element={<ProtectedRoute><ClientPortalPage /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AiWorkspacePage /></ProtectedRoute>} />
      </Routes></Suspense>
    </AuthProvider>
  );
}
