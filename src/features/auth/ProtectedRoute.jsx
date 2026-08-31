import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider.jsx";

export function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <main className="page-shell">Loading secure workspace...</main>;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate replace to="/" />;
  }

  return children;
}
