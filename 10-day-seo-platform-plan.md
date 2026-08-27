# Company-Level SEO Agency Platform Plan

This plan expands the original SEO-only architecture into a serious agency-grade product. It keeps the existing direction from `seo-crm-architecture-no-crm.md`: React + Tailwind frontend, FastAPI backend, PostgreSQL, JWT/RBAC, multi-tenant agency isolation, integration adapters, and an AI provider abstraction.

The original file says auth, roles, protected routes, base layout, and client CRUD are already built and tested. This plan starts from that point.

## Product Vision

Build an all-in-one SEO agency operating system that combines client management, technical SEO audits, keyword tracking, competitor intelligence, content planning, backlink monitoring, local SEO, reporting, and AI-assisted workflows.

The platform should reduce dependency on scattered tools like Ubersuggest, Semrush, Ahrefs, Screaming Frog, GSC, GA4, and spreadsheets. It does not need to replace every advanced feature on day one, but it should be architected as a real company platform, not a simple dashboard.

## Reality Check: What Can Be Done in 10 Days

A true company-level SEO platform cannot be fully built in 10 days. In 10 days, the realistic target is a strong foundation plus one polished vertical slice that proves the product loop:

**Client -> Website -> SEO data -> Insight -> Task -> Report -> Client portal**

The full company-grade product should be planned across 12+ weeks, with the first 10 days used to create the technical base, product direction, and demo-grade core workflow.

## Target Users

### Agency Owner / Admin

- Wants visibility across all clients, retainers, delivery health, team workload, rankings, reports, and client risks.
- Needs client management, permissions, white-label reporting, team operations, and business-level dashboards.

### SEO Manager

- Owns strategy and delivery for assigned clients.
- Needs keyword movement, traffic trends, audits, competitor gaps, content plans, tasks, approvals, and report generation.

### SEO Specialist / Employee

- Executes technical fixes, content work, keyword research, link-building tasks, and reporting support.
- Needs a focused task dashboard, client context, SEO recommendations, briefs, issue details, and AI assistance.

### Client

- Wants simple proof of progress without internal agency complexity.
- Needs scoped dashboard, completed work, traffic/ranking movement, approved reports, recommendations, and next steps.

## Competitive Feature Benchmark

| Capability | Ubersuggest | Semrush | Ahrefs | Screaming Frog | Platform Target |
|---|---:|---:|---:|---:|---|
| Client/project management | Limited | Limited | Limited | No | Strong |
| Keyword research | Strong | Strong | Strong | No | Strong |
| Rank tracking | Yes | Strong | Strong | No | Strong |
| Site audit | Yes | Strong | Strong | Very strong | Strong V1, advanced later |
| Technical crawl | Basic | Strong | Strong | Very strong | Worker-based crawler |
| Competitor analysis | Yes | Strong | Very strong | No | Strong |
| Content gap | Yes | Strong | Strong | No | Strong |
| Backlink analysis | Yes | Strong | Very strong | Limited | Strong |
| Link intersect/gap | Limited | Yes | Strong | No | Phase 2 |
| AI visibility / AEO | Emerging | Yes | Yes | No | Phase 2 |
| AI content help | Yes | Yes | Yes | No | Strong |
| Local SEO | Limited | Strong | Partial | No | Phase 2 |
| Agency workflow/tasks | Weak | Weak | Weak | No | Core differentiator |
| Client portal | Weak | Limited | Limited | No | Core differentiator |
| White-label reporting | Yes | Strong | Yes | Export only | Strong |
| Alerts/monitoring | Yes | Strong | Yes | No | Strong |
| Approval workflows | No | Limited | No | No | Strong |

## Strategic Differentiator

Most SEO tools are strong at data but weak at agency execution. This platform should win by connecting SEO intelligence to actual delivery:

- Every audit issue can become a task.
- Every keyword opportunity can become a content brief.
- Every ranking drop can trigger an alert and investigation.
- Every completed task can feed into the monthly client report.
- Every client dashboard shows only approved, client-safe information.

The product is not just an SEO analytics tool. It is an SEO agency operating system.

## Reference Feature Inspiration

### Ubersuggest-Inspired Features

- Domain overview with organic traffic, domain authority-style score, organic keywords, backlinks, and top SEO pages.
- Keyword ideas grouped by questions, comparisons, prepositions, related terms, and long-tail opportunities.
- Keyword difficulty, search volume, CPC, paid difficulty, intent, and trend direction.
- Competitor keyword comparison.
- Site audit with SEO score, critical errors, warnings, recommendations, and crawl history.
- Content ideas based on keyword/topic performance.
- Rank tracking for selected keywords over time.

### Semrush-Inspired Features

- Position tracking by project, device, country, city, and search engine.
- Keyword gap between client domain and competitors.
- Backlink gap between client and competitors.
- Site audit with thematic reports: crawlability, HTTPS, Core Web Vitals, internal linking, markup, duplicate content, redirects.
- On-page SEO checker with page-level recommendations.
- Content marketing tools: topic research, SEO content template, writing assistant, content optimization.
- Listing/local SEO management for Google Business Profile-style visibility.
- Scheduled white-label reports.
- Alerts for ranking drops, traffic drops, technical issues, and toxic backlinks.

### Ahrefs-Inspired Features

- Site explorer for organic keywords, top pages, competing domains, traffic value, and backlink profile.
- Keywords explorer with parent topic, SERP overview, clicks potential, difficulty, volume, and ranking history.
- Content gap analysis.
- Link intersect to find websites linking to competitors but not the client.
- Backlink monitoring with new/lost/referring domains.
- Broken backlink and broken page discovery.
- Internal link opportunities.
- SERP feature tracking.

### Screaming Frog-Inspired Features

- Crawl-based technical audit engine.
- URL-level issue detection for status codes, titles, meta descriptions, headings, canonicals, directives, hreflang, image alt text, structured data, pagination, redirects, duplicate content, and orphan pages.
- Crawl comparison between two audit runs.
- Exportable audit data.
- Issue prioritization and task creation from audit findings.

## Company-Level Feature Modules

### 1. Agency Workspace and RBAC

- Agency workspace setup.
- Admin, Manager, Employee, and Client roles.
- Granular permissions beyond basic role checks.
- Client assignment rules.
- Audit trail for all sensitive actions.
- White-label branding per agency.

### 2. Client and Website Management

- Client CRUD, contacts, notes, status, retainer metadata.
- Website CRUD with multiple websites per client.
- Website ownership, environment, CMS, business category, location, target markets, and primary competitors.
- Client health score combining rankings, traffic, unresolved issues, overdue tasks, and report approval status.

### 3. SEO Command Center

- Role-aware dashboard.
- Agency-wide KPI overview.
- Per-client and per-website SEO dashboards.
- Organic traffic, clicks, impressions, CTR, average position, keyword distribution, ranking movement, issue count, completed work, and upcoming deadlines.
- Data freshness indicators.
- Clear mock/live data labeling.

### 4. Keyword Intelligence

- Keyword CRUD and groups.
- Ranking history.
- Keyword difficulty, search volume, CPC, intent, location, device, language, and search engine.
- Keyword clustering.
- Keyword gap against competitors.
- SERP features tracked per keyword.
- Winning/losing keywords.
- Cannibalization detection.
- Keyword opportunity score.
- Bulk CSV import/export.

### 5. Competitor Intelligence

- Competitor profiles per website.
- Competitor domain overview.
- Shared keywords.
- Missing keywords.
- Top competitor pages.
- Competitor backlink sources.
- Competitor content velocity.
- SERP overlap score.
- Market share of voice.

### 6. Technical SEO Audit Engine

- Crawl scheduler and manual crawl trigger.
- Crawl queue and background worker.
- URL inventory.
- Issue detection by severity and category.
- Crawl comparison between current and previous audit.
- Core Web Vitals and PageSpeed integration adapter.
- Robots.txt, sitemap, canonical, redirects, broken links, duplicate titles, missing meta descriptions, thin content, image alt, schema, hreflang, noindex, and internal link checks.
- Convert issue to task.

### 7. Backlink and Authority Monitoring

- Backlink inventory.
- New/lost backlinks.
- Referring domains.
- Anchor text distribution.
- Dofollow/nofollow split.
- Toxic/spam-risk scoring.
- Broken backlinks.
- Link intersect against competitors.
- Link-building prospects.
- Outreach status tracking without turning the platform into a CRM.

### 8. Content Planning and Optimization

- Content calendar.
- Topic clusters.
- Content brief generator.
- Page optimization checklist.
- Content gap analysis.
- Existing page refresh recommendations.
- Internal link suggestions.
- Meta title and description suggestions.
- FAQ and schema suggestions.
- AI writing assistant for briefs, outlines, summaries, and recommendations.

### 9. Local SEO

- Google Business Profile integration adapter.
- Location tracking.
- Local keyword rankings.
- Map pack visibility.
- Review monitoring.
- NAP consistency checklist.
- Local landing page recommendations.

### 10. Task, Project, and Delivery Management

- Task CRUD, comments, attachments, status, priority, deadline, and assignee.
- Project grouping per client.
- Kanban, list, and calendar views.
- Recurring SEO tasks.
- Task templates for audits, content, backlinks, local SEO, technical fixes, and monthly reporting.
- Workload view.
- SLA/deadline alerts.
- Activity logs.

### 11. Reporting and Client Portal

- White-label report builder.
- Monthly report generation.
- PDF export.
- Report approval workflow.
- Client-facing dashboard.
- Client-safe task visibility.
- Recommendations and completed work summary.
- Report history.
- Scheduled email delivery.
- Executive summary generated by AI but reviewed by a manager.

### 12. Alerts and Monitoring

- Ranking drop alerts.
- Traffic anomaly alerts.
- Audit issue alerts.
- Integration failure alerts.
- Report deadline alerts.
- Task deadline alerts.
- New/lost backlink alerts.
- Competitor movement alerts.

### 13. AI Assistant

- Ranking drop explanation.
- Keyword suggestions.
- Content brief generation.
- Competitor analysis summary.
- Audit issue summarization.
- Report summary.
- Issue-to-task conversion.
- Internal link suggestions.
- Page refresh recommendations.
- Natural-language query over client SEO data.

### 14. Integrations

- Mock provider for development and demos.
- Google Search Console.
- Google Analytics 4.
- PageSpeed Insights.
- Google Business Profile.
- Semrush.
- Ahrefs.
- Keyword Planner.
- Optional future connectors: Slack, email delivery, file storage, CMS publishing.

### 15. Search Experience and AEO Visibility

- AI Overview visibility tracking.
- ChatGPT/Gemini/Perplexity-style brand visibility tracking.
- Prompt tracking for priority topics.
- Citation/source monitoring.
- AI crawler accessibility checks.
- Entity and topical authority tracking.
- Comparison against competitors in AI-generated answers.

### 16. Site Change Monitoring

- Track changes to titles, descriptions, headings, canonicals, robots directives, schema, internal links, and page content.
- Alert when important SEO elements change.
- Compare before/after SEO impact.
- Track deployment dates and annotate ranking/traffic charts.

### 17. Forecasting and Prioritization

- Opportunity scoring for keywords, pages, technical issues, and backlinks.
- Estimated traffic uplift.
- Estimated effort level.
- Revenue/lead impact score where conversion data exists.
- Priority matrix: impact vs effort.
- Recommended next actions per client.

### 18. Agency Business Intelligence

- Client health score.
- Account risk score.
- Delivery status by client.
- Team workload and capacity.
- Overdue work.
- Report approval lag.
- SEO performance by manager/team.
- Retainer vs delivery load.

### 19. Knowledge Base and Playbooks

- Reusable SEO SOPs.
- Task templates.
- Audit playbooks.
- Content brief templates.
- Client onboarding checklist.
- Monthly reporting checklist.
- Internal notes and strategic context per client.

## Data Model Additions Needed

The original schema is a strong start, but a company-level product should add:

- `competitors`
- `competitor_keywords`
- `competitor_pages`
- `competitor_backlinks`
- `serp_snapshots`
- `serp_features`
- `rank_tracking_projects`
- `keyword_clusters`
- `keyword_opportunities`
- `crawl_runs`
- `crawled_urls`
- `technical_checks`
- `page_metrics`
- `page_changes`
- `top_pages`
- `content_briefs`
- `content_calendar_items`
- `content_clusters`
- `content_gap_items`
- `on_page_recommendations`
- `local_locations`
- `gbp_metrics`
- `review_snapshots`
- `backlink_snapshots`
- `link_prospects`
- `broken_backlinks`
- `brand_mentions`
- `ai_visibility_prompts`
- `ai_visibility_results`
- `alerts`
- `task_templates`
- `recurring_tasks`
- `report_templates`
- `scheduled_reports`
- `integration_sync_logs`
- `data_sources`
- `permission_overrides`
- `client_health_scores`
- `agency_kpis`

## Core Screens Required

### Admin Screens

- Agency dashboard.
- Clients list.
- Client detail.
- Website detail.
- Team management.
- Workload.
- Reports.
- Alerts.
- Integrations.
- Agency settings and white-label branding.

### Manager Screens

- Assigned client dashboard.
- Website SEO overview.
- Keyword intelligence.
- Competitors.
- Technical audits.
- Backlinks.
- Content plans.
- Tasks.
- Report builder.
- AI assistant.

### Employee Screens

- My tasks.
- Task detail.
- Audit issue detail.
- Content brief detail.
- Keyword opportunity detail.
- Client context panel.
- AI assistant.

### Client Screens

- Client dashboard.
- SEO performance.
- Completed work.
- Current priorities.
- Reports.
- Recommendations.

## Permission Matrix

| Feature | Admin | Manager | Employee | Client |
|---|---:|---:|---:|---:|
| Manage agency settings | Yes | No | No | No |
| Manage team | Yes | Limited | No | No |
| Manage all clients | Yes | Assigned only | Assigned only | Own only |
| View retainers/pricing | Yes | Optional | No | No |
| View internal notes | Yes | Yes | Yes | No |
| Create websites | Yes | Yes | No/Limited | No |
| View SEO dashboard | Yes | Yes | Yes | Client-safe only |
| Manage keywords | Yes | Yes | Yes | No |
| Run audits | Yes | Yes | Yes | No |
| Create tasks | Yes | Yes | Yes | No |
| Assign tasks | Yes | Yes | No/Limited | No |
| Approve reports | Yes | Yes | No | No |
| View reports | Yes | Yes | Yes | Approved only |
| Use AI assistant | Yes | Yes | Yes | No/Limited |
| Manage integrations | Yes | Yes | No | No |

## Non-Functional Requirements

### Security

- Multi-tenant query isolation across every endpoint.
- JWT access tokens and secure refresh-token handling.
- Password hashing with strong algorithm.
- Role and permission checks in shared dependencies.
- Encryption at rest for integration credentials.
- Client-safe response schemas.
- Audit logs for sensitive actions.

### Reliability

- Background jobs for crawls, syncs, reports, and AI-heavy work.
- Integration sync logs.
- Retry strategy for external APIs.
- Status tracking for long-running jobs.
- Alerting on failed syncs and failed reports.

### Performance

- Pagination and filtering for all large tables.
- Indexed tenant keys: `agency_id`, `client_id`, `website_id`.
- Materialized summary tables or cached aggregates for dashboards.
- Queue-based crawl and report generation.
- Avoid blocking API requests for heavy work.

### Observability

- Structured logs.
- Request IDs.
- Job IDs.
- Integration sync history.
- AI usage/cost logging.
- Error dashboards.

### Compliance and Data Protection

- Role-based access to sensitive client data.
- Clear mock/live data labels.
- Data retention policies.
- Export/delete workflows for client data.
- Backup and restore process before production.

## Recommended Technical Architecture Upgrades

### Backend

- Keep the modular monolith.
- Add background worker using Celery, RQ, Dramatiq, or FastAPI background tasks for MVP.
- Add service-level permission helpers.
- Add repository/query helpers for tenant scoping.
- Add adapter contracts for SEO data providers.
- Add report rendering service.
- Add crawl service as a separate module that can later become a worker service.

### Frontend

- Use a role-aware dashboard shell.
- Use feature folders by domain.
- Add shared data table, filters, charts, badges, empty states, and permission wrappers.
- Add consistent page tabs for website-level modules.
- Use React Query for server cache and stale data handling.
- Add clear loading, syncing, failed sync, and mock-data UI states.

### Database

- Add indexes for every scoped query.
- Add summary tables for dashboard speed.
- Add append-only activity logs.
- Add sync/job status tables.
- Store raw provider payloads only when needed, and separate them from normalized reporting tables.

## Release Milestones

### Milestone 1: Internal Alpha

**Target:** Core agency workflow works with mock data.

- Clients.
- Websites.
- Competitors.
- Keywords.
- SEO dashboard.
- Audits.
- Tasks.
- Basic reports.
- Client portal.

### Milestone 2: Private Beta

**Target:** Real client use with limited integrations.

- GSC integration.
- GA4 integration.
- PageSpeed integration.
- Scheduled reports.
- Alerts.
- Better audit engine.
- Client-safe portal validation.
- Production backups and monitoring.

### Milestone 3: Agency-Grade Launch

**Target:** Serious use by a small agency team.

- Competitor gap.
- Backlink monitoring.
- Content planning.
- AI content briefs.
- Local SEO.
- Advanced reporting.
- Workload/capacity.
- Strong QA and security testing.

### Milestone 4: Scale Version

**Target:** Multi-agency SaaS readiness.

- Billing.
- Plan limits.
- Usage metering.
- Advanced permissions.
- API access.
- Webhooks.
- White-label domains.
- Data warehouse/export.
- Enterprise audit logs.

## Team Assumptions

For a serious company-level version, assume at least:

- 1 product owner.
- 1 UI/UX designer.
- 2 frontend engineers.
- 2 backend engineers.
- 1 data/integration engineer.
- 1 QA engineer.
- 1 DevOps/cloud engineer part-time.

A solo developer can still build the foundation, but timelines should be treated as prototype timelines, not full company delivery timelines.

## 10-Day Company-Level Execution Sprint

This is not the full company roadmap. It is the first serious 10-day sprint that creates a scalable foundation and a strong demo-quality vertical slice.

## Day 1: Product Definition, Data Model, and System Foundation

**Goal:** Convert the architecture into an implementation-ready company plan.

- Finalize product modules and MVP boundaries.
- Define user permissions for Admin, Manager, Employee, and Client.
- Review the existing database schema and add missing company-level tables.
- Add migration plan for competitors, crawls, alerts, report templates, sync logs, and content briefs.
- Define shared scoping helpers for `agency_id`, `client_id`, and assigned-client access.
- Define API response rules for internal vs client-safe fields.

**Deliverable:** Updated schema, permission matrix, and implementation-ready module boundaries.

## Day 2: Website Management, Competitors, and Project Setup

**Goal:** Make each client website the center of SEO work.

- Complete Website CRUD backend and frontend.
- Add primary competitors per website.
- Store business category, target locations, target search engines, CMS, and preferred locale.
- Add website detail page with tabs: Overview, Keywords, Audit, Competitors, Backlinks, Content, Tasks, Reports.
- Add seed data for realistic demo clients and competitors.

**Deliverable:** A client can have websites, competitors, and project-level SEO settings.

## Day 3: Keyword Research and Rank Tracking Foundation

**Goal:** Build a keyword intelligence layer inspired by Ubersuggest, Semrush, and Ahrefs.

- Implement keyword groups, keyword CRUD, and ranking history.
- Add keyword metrics: volume, difficulty, CPC, intent, device, location, language, source.
- Add mock rank tracking generator for 30/90-day history.
- Add keyword movement summaries: improved, declined, unchanged, top 3, top 10, top 100.
- Add keyword import/export.
- Build keyword table with filters and ranking chart.

**Deliverable:** A usable keyword tracking system with historical movement.

## Day 4: SEO Dashboard and Share of Voice

**Goal:** Create the main performance view for managers and clients.

- Build per-website SEO summary endpoint.
- Add KPI cards for organic traffic, clicks, impressions, CTR, average position, SEO score, ranking movement, audit health, backlinks, and tasks.
- Add traffic trend, ranking trend, keyword position distribution, and top pages widgets.
- Add competitor visibility/share-of-voice mock calculation.
- Add data freshness and mock/live labels.
- Build client-safe version of the dashboard.

**Deliverable:** A strong SEO command center for internal users and clients.

## Day 5: Technical Audit Engine V1

**Goal:** Build a crawl-inspired audit workflow.

- Create audit run model and URL-level audit data model.
- Implement rule-based mock crawler first, with adapter boundary for a real crawler later.
- Detect common issues: broken links, missing titles, duplicate titles, missing meta descriptions, duplicate meta descriptions, thin content, missing H1, multiple H1s, image alt issues, noindex, redirect chains, canonical problems, sitemap gaps, robots.txt blocks, slow pages.
- Add issue severity scoring.
- Add crawl history and audit comparison foundation.
- Add audit issue UI with severity, category, URL, status, and "create task" action.

**Deliverable:** Users can run audits, inspect issues, and convert issues into work.

## Day 6: Task and Workflow System

**Goal:** Connect SEO insights to agency execution.

- Implement task CRUD, comments, attachment metadata, assignments, status changes, deadlines, and priority.
- Add task templates for technical SEO, content, backlink, local SEO, and reporting work.
- Add task creation from keyword opportunity, audit issue, backlink issue, or content brief.
- Build list, detail, and Kanban views.
- Add employee "My Tasks" dashboard.
- Add activity logging for task actions.

**Deliverable:** Insights can become assigned work with clear ownership.

## Day 7: Competitor and Backlink Intelligence

**Goal:** Add the features that make the platform feel like an SEO tool, not just project management.

- Add competitor keyword gap endpoint using mock/provider data.
- Add competitor top pages and shared keyword views.
- Add backlink inventory with new/lost backlinks, referring domains, anchor text, and dofollow/nofollow.
- Add backlink gap/link intersect model.
- Add broken backlink and suspicious backlink flags.
- Build competitor and backlink pages under each website.

**Deliverable:** Managers can see what competitors are ranking for and where backlink opportunities exist.

## Day 8: Content Planning and AI-Assisted SEO

**Goal:** Add content workflows that map directly to rankings and client deliverables.

- Add content brief model and endpoints.
- Add topic clusters and content calendar items.
- Build content gap view from competitor and keyword data.
- Implement AI provider abstraction if not already present.
- Add prompts for content briefs, ranking explanations, page refresh recommendations, and report summaries.
- Store AI request history with input/output.
- Add rate limiting and usage logging for AI endpoints.

**Deliverable:** Users can create SEO content briefs and recommendations from platform data.

## Day 9: Reporting, Client Portal, and Alerts

**Goal:** Package work into client-facing outcomes.

- Build report templates and monthly report generation.
- Add report sections: executive summary, traffic, rankings, keyword wins/losses, technical fixes, completed tasks, backlinks, content work, next-month plan.
- Add PDF export.
- Add report approval and sent status.
- Add client portal dashboard and report history.
- Implement alerts for ranking drops, traffic drops, audit failures, overdue tasks, new critical issues, and integration sync failures.

**Deliverable:** Clients can log in and see progress without seeing internal agency data.

## Day 10: Security, QA, Integration Readiness, and Demo Packaging

**Goal:** Make the platform credible for company-level review.

- Extend tenant-isolation tests across all modules.
- Add RBAC tests for every major endpoint.
- Add client-safe response tests to ensure retainers, internal notes, and employee-only fields never leak.
- Add integration adapter contracts and sync logs.
- Add observability: structured logs, request IDs, sync status, error states.
- Run backend and frontend test suites.
- Fix critical UI states: loading, empty, error, restricted access, mock/live labels.
- Prepare demo data and deployment checklist.

**Deliverable:** A company-grade MVP foundation ready for staging/demo, with clear next-phase paths for live integrations and advanced automation.

## 12-Week Company-Level Roadmap

## Weeks 1-2: Foundation and Core Entities

- Finalize data model and permissions.
- Complete clients, websites, competitors, team assignments, and project settings.
- Add seed data and demo scenarios.
- Add shared UI system.
- Add service-layer tenant isolation helpers.
- Add base test coverage.

**Exit criteria:** A logged-in agency team can manage clients, websites, competitors, and assignments safely.

## Weeks 3-4: Keywords, Rankings, and SEO Dashboard

- Build keyword research/tracking.
- Add ranking history and mock/live provider boundary.
- Build dashboard widgets.
- Add share of voice.
- Add keyword movement alerts.
- Add CSV import/export.

**Exit criteria:** A manager can understand website performance and keyword movement from one dashboard.

## Weeks 5-6: Technical Audits and Task Workflow

- Build crawl/audit data model.
- Implement audit engine V1.
- Add issue prioritization.
- Add issue-to-task conversion.
- Build task list, detail, Kanban, comments, and assignments.
- Add task templates and recurring tasks.

**Exit criteria:** SEO findings turn into assigned work and can be tracked to completion.

## Weeks 7-8: Competitors, Backlinks, and Content Planning

- Add keyword gap.
- Add backlink inventory.
- Add link gap/link intersect.
- Add top pages and content gap.
- Add content brief and calendar.
- Add AI content brief generation.

**Exit criteria:** Managers can plan SEO strategy from competitor and content opportunities.

## Weeks 9-10: Reporting, Client Portal, and Alerts

- Build report templates.
- Add PDF generation.
- Add approval workflow.
- Add client dashboard and report history.
- Add alerts for rankings, traffic, audits, reports, and tasks.
- Add email-ready notification hooks.

**Exit criteria:** Clients can safely see progress and reports without internal data leakage.

## Weeks 11-12: Integrations, Hardening, and Launch Prep

- Add GSC integration.
- Add GA4 integration.
- Add PageSpeed integration.
- Add sync logs and retry behavior.
- Extend RBAC and tenant-isolation tests.
- Add observability.
- Prepare staging deployment and demo scripts.

**Exit criteria:** The product is ready for controlled private beta.

## Advanced Features Backlog

### SEO Intelligence

- SERP screenshots/history.
- AI Overview visibility.
- Featured snippet tracking.
- People Also Ask tracking.
- Search intent change detection.
- Cannibalization maps.
- Internal link graph.
- Crawl budget analysis.
- Index coverage analysis.
- Sitemap intelligence.

### Agency Operations

- Client risk scoring.
- Retainer profitability.
- Team capacity forecasting.
- Delivery SLA tracking.
- Client approval workflows.
- Meeting notes and action items.
- Report comments.
- Client onboarding templates.

### Content and AEO

- Entity coverage.
- Topical authority maps.
- AI-search content readiness.
- Content decay detection.
- Content refresh queue.
- Schema recommendation engine.
- FAQ opportunity finder.

### Integrations

- Google Search Console.
- Google Analytics 4.
- Google Business Profile.
- PageSpeed Insights.
- Semrush.
- Ahrefs.
- Slack.
- Gmail/email delivery.
- Google Drive.
- CMS integrations such as WordPress later.

## Success Metrics

### Product Metrics

- Time to onboard a new client.
- Time to generate first report.
- Number of SEO issues converted to tasks.
- Task completion rate.
- Report approval rate.
- Client portal usage.
- Keyword movement tracked per client.
- Active integrations per website.

### Business Metrics

- Client retention risk reduction.
- Manager time saved per report.
- Audit-to-task conversion rate.
- Average overdue tasks per client.
- Number of clients per manager.
- Monthly recurring usage by agency staff.

### Technical Metrics

- Tenant-isolation test coverage.
- API response time.
- Background job success rate.
- Integration sync success rate.
- Report generation success rate.
- AI cost per client/month.
- Error rate by module.

## 30/60/90-Day Roadmap

## First 30 Days: MVP Operating System

- Auth, RBAC, tenant isolation.
- Clients, websites, competitors.
- Keyword tracking with mock and import data.
- SEO dashboard.
- Technical audit V1.
- Task workflow.
- Basic reporting and client portal.
- AI assistant V1.
- Alerts V1.

## Days 31-60: Real Integrations and Advanced SEO

- Google Search Console integration.
- GA4 integration.
- PageSpeed Insights integration.
- Real crawl worker.
- Scheduled rank tracking.
- Keyword gap and backlink gap improvements.
- Scheduled reports.
- Better content calendar.
- Local SEO V1.

## Days 61-90: Scale, Automation, and Differentiation

- Semrush/Ahrefs adapter support where API access is available.
- Advanced competitor market share.
- Backlink toxicity and outreach workflow.
- SERP snapshot tracking.
- AI natural-language analytics.
- Custom report builder.
- Agency performance analytics.
- Billing/subscription readiness if this becomes SaaS.
- Production hardening, backups, monitoring, and role audit tooling.

## Suggested Build Priority

1. Multi-tenant safety and permissions.
2. Websites and competitors.
3. Keywords and rank tracking.
4. SEO dashboard.
5. Technical audits.
6. Tasks and workflow.
7. Reporting and client portal.
8. Competitor gap and backlink intelligence.
9. Content planning and AI assistant.
10. Alerts and live integrations.

## What Not To Overbuild First

- Full CRM or sales pipeline.
- Fully automated AI agents that change client data without approval.
- Real-time crawling at scale.
- Complex billing/subscription logic.
- Deep CMS publishing integrations.
- Advanced custom dashboard builder.

These can come later. The first company-level version should prove the core loop:

**Website data -> SEO insight -> assigned task -> completed work -> client-facing report.**
