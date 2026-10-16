import { Link, Navigate, useLocation } from "react-router-dom";

import { ErrorState } from "../../components/ui/index.js";
import { useAuth } from "./AuthProvider.jsx";

export function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <main aria-busy="true" className="page-shell route-loading" role="status">Loading secure workspace...</main>;
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    const homePath = user?.role === "client" ? "/portal" : "/";
    return (
      <main className="page-shell permission-page">
        <ErrorState
          action={<Link className="ui-button ui-button--primary ui-button--md" to={homePath}>Back to your workspace</Link>}
          description="This area is reserved for another role in your agency. Ask an administrator if you need access."
          title="You do not have access to this page"
        />
      </main>
    );
  }

  return children;
}
