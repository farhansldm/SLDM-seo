import { Link } from "react-router-dom";

import { productModules } from "../../../shared/modules.js";
import { useAuth } from "../auth/AuthProvider.jsx";

export function DashboardPage() {
  const dayOneModules = productModules.filter((module) => module.dayOneScope);
  const { signOut, user } = useAuth();

  return (
    <main className="page-shell">
      <header className="page-header page-header-row">
        <div>
          <span>JavaScript-only company foundation</span>
          <h1>SEO Agency Platform</h1>
          <p>
            Day 1 establishes the React app, Node API foundation, Prisma data model, RBAC rules, tenant scoping, and
            client-safe response contracts.
          </p>
        </div>
        <div className="session-card" aria-label="Current session">
          <strong>{user?.fullName ?? "Authenticated user"}</strong>
          <span>{user?.role ?? "role"}</span>
          <button onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </header>

      <section className="module-grid" aria-label="Day 1 modules">
        {dayOneModules.map((module) => (
          <article className="module-card" key={module.key}>
            <span>{module.key}</span>
            <strong>{module.name}</strong>
          </article>
        ))}
      </section>

      <section className="quick-actions" aria-label="Day 3 actions">
        <Link to="/clients">Manage clients</Link>
        <Link to="/websites">Manage websites</Link>
        <Link to="/keywords">Open keyword tracking</Link>
        <Link to="/seo-dashboard">Open SEO dashboard</Link>
        <Link to="/audits">Open technical audits</Link>
      </section>
    </main>
  );
}
