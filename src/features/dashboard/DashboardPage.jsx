import { Link } from "react-router-dom";

import { productModules } from "../../../shared/modules.js";
import { useAuth } from "../auth/AuthProvider.jsx";

export function DashboardPage() {
  const mvpModules = productModules.filter((module) => module.dayOneScope);
  const { user } = useAuth();

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <span>Agency operations workspace</span>
          <h1>SEO Agency Platform</h1>
          <p>
            Manage client SEO delivery, research, audits, tasks, reporting, and approvals from one secure workspace.
          </p>
        </div>
      </header>

      <section className="module-grid" aria-label="Platform modules">
        {mvpModules.map((module) => (
          <article className="module-card" key={module.key}>
            <span>{module.key}</span>
            <strong>{module.name}</strong>
          </article>
        ))}
      </section>

      <section className="quick-actions" aria-label="Workspace navigation">
        <Link to="/clients">Manage clients</Link>
        <Link to="/websites">Manage websites</Link>
        <Link to="/keywords">Open keyword tracking</Link>
        <Link to="/seo-dashboard">Open SEO dashboard</Link>
        <Link to="/audits">Open technical audits</Link>
        <Link to="/tasks">Open task workflow</Link>
        {user?.role !== "client" ? <Link to="/ai">Open AI research</Link> : null}
        {user?.role === "client" ? <Link to="/portal">Open client portal</Link> : null}
        {["admin", "manager"].includes(user?.role) ? <Link to="/reports">Open reports</Link> : null}
      </section>
    </main>
  );
}
