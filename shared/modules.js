export const productModules = [
  { key: "agency_workspace", name: "Agency Workspace and RBAC", dayOneScope: true },
  { key: "auth", name: "Authentication and Authorization", dayOneScope: true },
  { key: "clients", name: "Client Management", dayOneScope: true },
  { key: "websites", name: "Website Management", dayOneScope: true },
  { key: "competitors", name: "Competitor Intelligence", dayOneScope: true },
  { key: "keywords", name: "Keyword Intelligence", dayOneScope: true },
  { key: "seo_dashboard", name: "SEO Command Center", dayOneScope: true },
  { key: "technical_audits", name: "Technical SEO Audit Engine", dayOneScope: true },
  { key: "tasks", name: "Task and Delivery Management", dayOneScope: true },
  { key: "reporting", name: "Reporting and Client Portal", dayOneScope: true },
  { key: "alerts", name: "Alerts and Monitoring", dayOneScope: true },
  { key: "integrations", name: "Integration Foundation", dayOneScope: true },
  { key: "ai", name: "AI Assistant Foundation", dayOneScope: true },
  { key: "billing", name: "Billing", dayOneScope: false },
  { key: "enterprise_sso", name: "Enterprise SSO", dayOneScope: false },
  { key: "advanced_aeo", name: "Advanced AI Search Visibility", dayOneScope: false },
];

export const mvpBoundaries = {
  inScope: productModules.filter((module) => module.dayOneScope).map((module) => module.key),
  outOfScope: productModules.filter((module) => !module.dayOneScope).map((module) => module.key),
};