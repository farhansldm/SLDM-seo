import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "../features/auth/AuthProvider.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import { DashboardPage } from "../features/dashboard/DashboardPage.jsx";
import { useWorkspace, WorkspaceProvider } from "../features/workspace/WorkspaceProvider.jsx";
import { AppShell } from "./AppShell.jsx";
import { ToastProvider } from "../components/ui/index.js";

const ClientsPage = lazy(() => import("../features/clients/ClientsPage.jsx").then((module) => ({ default: module.ClientsPage })));
const WebsitesPage = lazy(() => import("../features/websites/WebsitesPage.jsx").then((module) => ({ default: module.WebsitesPage })));
const KeywordPage = lazy(() => import("../features/keywords/KeywordPage.jsx").then((module) => ({ default: module.KeywordPage })));
const SeoDashboardPage = lazy(() => import("../features/seo-dashboard/SeoDashboardPage.jsx").then((module) => ({ default: module.SeoDashboardPage })));
const TechnicalAuditPage = lazy(() => import("../features/audits/TechnicalAuditPage.jsx").then((module) => ({ default: module.TechnicalAuditPage })));
const TasksPage = lazy(() => import("../features/tasks/TasksPage.jsx").then((module) => ({ default: module.TasksPage })));
const ClientPortalPage = lazy(() => import("../features/reports/ClientPortalPage.jsx").then((module) => ({ default: module.ClientPortalPage })));
const ReportsPage = lazy(() => import("../features/reports/ReportsPage.jsx").then((module) => ({ default: module.ReportsPage })));
const AiWorkspacePage = lazy(() => import("../features/ai/AiWorkspacePage.jsx").then((module) => ({ default: module.AiWorkspacePage })));
const OnboardingPage = lazy(() => import("../features/onboarding/OnboardingPage.jsx").then((module) => ({ default: module.OnboardingPage })));
const staffRoles = ["admin", "manager", "employee"];

function HomeRoute() {
  const { user } = useAuth();
  const workspace = useWorkspace();
  if (user?.role === "client") return <Navigate replace to="/portal" />;
  if (user?.role === "admin" && workspace.status === "ready" && !workspace.clients.length) return <Navigate replace to="/onboarding" />;
  return <DashboardPage />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider><Suspense fallback={<main aria-busy="true" className="route-loading" role="status">Loading workspace...</main>}><Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <WorkspaceProvider>
                <AppShell />
              </WorkspaceProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRoute />} />
          <Route path="clients" element={<ProtectedRoute allowedRoles={staffRoles}><ClientsPage /></ProtectedRoute>} />
          <Route path="websites" element={<ProtectedRoute allowedRoles={staffRoles}><WebsitesPage /></ProtectedRoute>} />
          <Route path="keywords" element={<ProtectedRoute allowedRoles={staffRoles}><KeywordPage /></ProtectedRoute>} />
          <Route path="seo-dashboard" element={<ProtectedRoute allowedRoles={staffRoles}><SeoDashboardPage /></ProtectedRoute>} />
          <Route path="audits" element={<ProtectedRoute allowedRoles={staffRoles}><TechnicalAuditPage /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute allowedRoles={staffRoles}><TasksPage /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><ReportsPage /></ProtectedRoute>} />
          <Route path="portal" element={<ProtectedRoute allowedRoles={["client"]}><ClientPortalPage /></ProtectedRoute>} />
          <Route path="ai" element={<ProtectedRoute allowedRoles={staffRoles}><AiWorkspacePage /></ProtectedRoute>} />
          <Route path="onboarding" element={<ProtectedRoute allowedRoles={["admin"]}><OnboardingPage /></ProtectedRoute>} />
        </Route>
      </Routes></Suspense></ToastProvider>
    </AuthProvider>
  );
}
