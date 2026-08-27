import { productModules } from "../../../shared/modules.js";

export function DashboardPage() {
  const dayOneModules = productModules.filter((module) => module.dayOneScope);

  return (
    <main className="page-shell">
      <header className="page-header">
        <span>JavaScript-only company foundation</span>
        <h1>SEO Agency Platform</h1>
        <p>
          Day 1 establishes the React app, Node API foundation, Prisma data model, RBAC rules, tenant scoping, and
          client-safe response contracts.
        </p>
      </header>

      <section className="module-grid" aria-label="Day 1 modules">
        {dayOneModules.map((module) => (
          <article className="module-card" key={module.key}>
            <span>{module.key}</span>
            <strong>{module.name}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}