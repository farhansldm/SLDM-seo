# SEO Platform Frontend UI/UX Redesign Plan

## Objective

Transform the existing functional React interface into a polished, company-level SEO operations platform. The redesign must improve navigation, workflow clarity, visual hierarchy, responsiveness, accessibility, interaction feedback, and maintainability without changing established backend architecture or tenant-security behavior.

## Design Direction

The supplied premium palette is the brand foundation:

| Token | Color | Intended use |
| --- | --- | --- |
| Brand 900 | `#4A3F2E` | Sidebar, strong brand surfaces, prominent headings |
| Brand 700 | `#736545` | Secondary brand actions and selected states |
| Brand 500 | `#A79A6E` | Muted accents and secondary chart data |
| Brand 300 | `#CDC29B` | Dividers, inactive controls, subtle highlights |
| Brand 100 | `#E7E0C6` | Soft backgrounds and selected rows |
| Brand 50 | `#F8F5E9` | Application canvas and light brand surfaces |

The product will also use white and dark neutral surfaces for readability, teal for primary interaction, and restrained green, amber, red, and blue semantic colors for status, warnings, errors, focus, and data visualization.

## Product Principles

- Build an operational SaaS workspace, not a decorative marketing site.
- Keep information dense, organized, and easy to scan.
- Preserve client, website, role, and tenant context across workflows.
- Replace technical IDs with searchable selectors wherever possible.
- Use shared controls and interaction patterns across every module.
- Provide clear loading, empty, success, warning, error, and permission states.
- Meet WCAG AA contrast and keyboard-navigation expectations.
- Support mobile, tablet, laptop, desktop, and wide-desktop layouts.
- Keep cards limited to meaningful records, tools, and repeated items.
- Use human-facing product language instead of development milestones.

## Phase 1: UX Audit And Visual Foundations

**Status: Complete**

### Tasks

- Audit all screens, routes, workflows, tables, charts, forms, and role differences.
- Identify navigation gaps, repeated CSS, raw-ID inputs, and inconsistent feedback.
- Convert the supplied palette into reusable CSS design tokens.
- Add neutral surfaces and semantic interaction/status colors.
- Route existing interface and chart colors through the token system.
- Establish typography, spacing, content width, border, radius, and shadow rules.
- Add visible focus styles, improved form states, and reduced-motion support.
- Remove internal Day and plan labels from customer-facing screens.

### Acceptance Criteria

- Presentation colors are centralized in the token file.
- Text, controls, and focus states meet practical contrast requirements.
- Existing screens still compile and function without backend changes.
- Internal development language is no longer visible in the product.
- Tests, ESLint, and production build pass.

### Completed Task Commit Messages

- `Map the real workflows behind the SEO workspace`
- `Build the premium palette into a practical product design system`
- `Give every screen a calmer and more accessible visual rhythm`
- `Replace project milestones with language customers can trust`
- `Finish the first design foundation with a clean production build`

## Phase 2: Application Shell And Navigation

**Status: Complete**

### Tasks

- Restructure protected routes around one shared application shell.
- Build grouped navigation for Workspace, Intelligence, and Delivery.
- Filter navigation by Admin, Manager, Employee, and Client role.
- Add active-route styling and persisted desktop sidebar collapse behavior.
- Add tenant-scoped client and website selectors to the top bar.
- Persist the selected client and website per agency.
- Add route-aware breadcrumbs and a staff notification entry point.
- Add an account menu with identity, role, email, and sign-out control.
- Add a responsive mobile drawer, backdrop, close controls, and Escape handling.
- Redirect clients to the client portal and protect internal routes by role.
- Verify desktop and mobile behavior through screenshots and overflow checks.

### Acceptance Criteria

- Every protected page renders inside one consistent product shell.
- Navigation clearly reflects the signed-in user's role.
- Client and website context persists between routes and reloads.
- Sidebar collapse does not resize or break navigation controls.
- Mobile navigation is usable without overlapping page content.
- Account and navigation menus work with keyboard and pointer input.
- Tests, ESLint, and production build pass.

### Completed Task Commit Messages

- `Bring every protected screen into one coherent workspace`
- `Turn the module list into a navigation system built for daily work`
- `Keep client and website context close at hand across the platform`
- `Make the workspace feel at home on every screen and every role`
- `Polish the workspace shell across desktop and mobile`
- `Keep client and website context close at hand across the platform`
- `Make the workspace feel at home on every screen and every role`

## Phase 3: Reusable Component System

**Status: Pending**

### Tasks

- Create shared button, icon-button, input, select, textarea, checkbox, and toggle components.
- Create shared page header, filter bar, toolbar, tabs, badges, and status indicators.
- Create dialog, confirmation modal, drawer, dropdown, tooltip, and toast patterns.
- Create KPI, chart-panel, table, pagination, empty-state, error-state, and skeleton components.
- Add consistent control sizes, disabled states, destructive actions, and validation messages.
- Replace duplicated page-specific controls with shared components incrementally.

### Acceptance Criteria

- Shared controls have consistent interaction and accessibility behavior.
- No page invents a different button, field, status, or notification pattern.
- Components support compact operational layouts and responsive constraints.
- Shared components are documented by usage through existing screens and tests.

## Phase 4: Authentication And Onboarding

**Status: Pending**

### Tasks

- Redesign login and signup around the premium visual system.
- Add password visibility, inline validation, and clearer submission feedback.
- Design email-confirmation, expired-session, rate-limit, and recovery states.
- Add a first-login agency setup flow.
- Build guided client and website onboarding.
- Replace technical onboarding fields with understandable business questions.
- Add completion progress and useful empty states for new accounts.

### Acceptance Criteria

- Authentication works cleanly on mobile and desktop.
- Every Supabase authentication state has a clear user-facing recovery path.
- New users can create their first usable workspace without entering database IDs.
- Onboarding does not expose internal architecture or implementation language.

## Phase 5: Dashboard, Clients, And Websites

**Status: Pending**

### Tasks

- Replace the module-card homepage with an operational agency dashboard.
- Add KPIs, movement, alerts, due tasks, data freshness, and quick actions.
- Add client health, recent activity, and delivery-risk visibility.
- Redesign Clients as a searchable, filterable, sortable table.
- Build client detail tabs for Overview, Contacts, Websites, Team, Notes, Tasks, and Reports.
- Redesign Website management around the active client context.
- Add structured competitor, location, locale, CMS, and search-engine management.
- Remove manual Client ID and User ID fields where selectable records exist.

### Acceptance Criteria

- Users can reach common daily actions within two interactions.
- Client and website context flows naturally from the application shell.
- Client-safe and internal data remain visibly and functionally separated.
- Empty, loading, and failure states are complete.

## Phase 6: SEO Research And Analytics

**Status: Pending**

### Tasks

- Redesign keyword research, tracking, import, export, and bulk workflows.
- Add saved filters, intent grouping, movement indicators, and useful table actions.
- Improve ranking charts with date ranges, comparison periods, and readable tooltips.
- Redesign the SEO dashboard around traffic, visibility, rankings, and share of voice.
- Add clearer top-page, competitor, and keyword drill-down behavior.
- Redesign technical audits with grouped issues, severity filters, and repair status.
- Add competitor and backlink research navigation and result views.
- Show source, freshness, and mock/live-data status consistently.

### Acceptance Criteria

- Research workflows no longer require raw database identifiers.
- Charts remain readable and correctly sized at supported breakpoints.
- Tables support scanning, filtering, comparison, and repeated actions.
- Positive and negative performance is understandable without relying only on color.

## Phase 7: Tasks, AI, Reports, And Client Portal

**Status: Pending**

### Tasks

- Add List, Board, My Work, Workload, and Alerts task views.
- Move task details, comments, attachments, and state changes into an ergonomic drawer.
- Redesign AI Workspace around workflow selection, context, generation, history, and review.
- Clearly distinguish AI drafts, failures, pending review, approved output, and rejected output.
- Redesign Reports as a library, builder, preview, approval, and download workflow.
- Add activity timelines and clearer approval history.
- Simplify the client portal around performance, completed work, priorities, and approved reports.
- Ensure clients never see internal notes, AI prompts, costs, or operational metadata.

### Acceptance Criteria

- Staff can complete routine delivery workflows without jumping between unrelated screens.
- AI output cannot be mistaken for approved client-facing work.
- Report approval and client publication states are obvious.
- Client portal navigation and language remain simple and client-safe.

## Phase 8: Responsive, Accessibility, Performance, And Release QA

**Status: Pending**

### Tasks

- Test all screens at mobile, tablet, laptop, desktop, and wide-desktop widths.
- Prevent toolbar, table, chart, button, and text overflow.
- Verify keyboard navigation, focus order, labels, dialogs, menus, and drawers.
- Verify screen-reader semantics and status announcements.
- Add reduced-motion behavior to new transitions and interactive elements.
- Check loading performance, route chunks, unnecessary rendering, and layout shifts.
- Capture visual-regression screenshots for major screens and roles.
- Test loading, empty, success, failure, permission, and disconnected-service states.
- Run complete tests, lint, build, and production smoke checks.

### Acceptance Criteria

- No incoherent overlap or horizontal page overflow at supported widths.
- Critical workflows are keyboard accessible.
- Production build remains within agreed bundle limits.
- Admin, Manager, Employee, and Client experiences pass role-specific smoke tests.

## Execution Rules

- Execute one phase at a time.
- Complete and validate each task before starting the next task.
- Stop at the end of each phase for review.
- Do not change backend behavior unless the approved UI workflow genuinely requires it.
- Reuse existing APIs and architecture before proposing new endpoints.
- Do not edit the original project planning or architecture files as part of UI completion.
- Run relevant tests, ESLint, production build, and visual checks in every phase.
- Report any validation that could not be completed instead of assuming success.

## Commit Message Style

After every completed task, provide one natural, humanized commit message.

Use:

- `Shape the dashboard around the work agencies do every morning`
- `Make client context follow users through the workspace`
- `Give technical issues a clearer path from discovery to action`

Do not use:

- `feat: add dashboard`
- `fix: update styles`
- `chore: UI changes`
- `add navbar boilerplate`

## Estimated Delivery

The complete redesign is expected to require approximately 14 to 17 focused working days. Quality gates and review feedback may change the estimate, but phases should not be marked complete until their acceptance criteria and validation checks pass.
