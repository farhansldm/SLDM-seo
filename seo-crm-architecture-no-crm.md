# SEO Agency Management Platform (SEO-Only) — Architecture & Implementation Plan

## 0. Summary

A centralized web platform replacing the fragmented Semrush + Ahrefs + Screaming Frog + GSC + GA4 + spreadsheets stack that SEO agencies currently juggle. One system for client management, SEO performance tracking, task/project management, reporting, and AI-assisted SEO work, with role-based dashboards for Admin, Manager, Employee, and Client.

**Scope note:** this version deliberately excludes CRM/sales (leads, deals, pipeline). It assumes clients already exist in the system — onboarding a new client is a direct "add client" action by an Admin/Manager, not a converted deal. If a sales pipeline becomes a real need later, it slots in as an additive module without touching anything below.

Stack: **React + Tailwind (frontend)**, **FastAPI (backend)**, **PostgreSQL (database)**, **JWT (auth)**, **pluggable LLM layer (AI)**.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│   React SPA (Admin / Manager / Employee / Client dashboards)     │
│   Tailwind CSS · Recharts/Chart.js · React Router · React Query  │
└───────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JWT Bearer
┌───────────────────────────▼────────────────────────────────────┐
│                        API GATEWAY LAYER                         │
│              FastAPI app (routers per module, CORS,              │
│              rate limiting, request validation via Pydantic)     │
└───────────────────────────┬────────────────────────────────────┘
                             │
┌───────────────────────────▼────────────────────────────────────┐
│                        SERVICE LAYER                              │
│  auth_service · client_service · website_service · seo_service   │
│  keyword_service · audit_service · task_service · report_service │
│  team_service · ai_service · integration_service                 │
│  (business logic lives here, NOT in routers)                     │
└──────────┬───────────────────────────────────┬──────────────────┘
           │                                   │
┌──────────▼─────────────┐         ┌───────────▼───────────────────┐
│   DATA ACCESS LAYER      │         │      EXTERNAL INTEGRATIONS     │
│   SQLAlchemy ORM +       │         │  GSC · GA4 · Keyword Planner   │
│   Alembic migrations     │         │  PageSpeed Insights · Semrush  │
│                          │         │  Ahrefs · Google Business      │
└──────────┬───────────────┘         │  Profile — each behind an      │
           │                        │  adapter interface, swappable  │
┌──────────▼─────────────┐         └───────────┬───────────────────┘
│      PostgreSQL          │                     │
│  (row-level tenant       │         ┌───────────▼───────────────────┐
│   isolation by agency_id │         │          AI LAYER              │
│   / client_id)           │         │  LLM provider abstraction      │
└──────────────────────────┘         │  (Anthropic / OpenAI / other)  │
                                      │  Prompt templates per task     │
                                      │  (ranking explain, content     │
                                      │  brief, competitor analysis)   │
                                      └─────────────────────────────────┘
```

**Key architectural decisions**

- **Modular monolith, not microservices.** FastAPI with clean module boundaries (routers → services → repositories) gives separation of concerns without deployment overhead. Split into services later only if a specific module (e.g. AI layer, or audit crawling) needs independent scaling.
- **Multi-tenant from day one.** Every client-owned table carries `agency_id` and, where relevant, `client_id`. All queries are scoped through a service-layer helper that injects these filters — never trust a bare `client_id` from the request body.
- **Integrations are adapters, not hardcoded calls.** Each external API (GSC, GA4, Semrush, etc.) implements a common interface (`fetch_traffic()`, `fetch_rankings()`, etc.) so the rest of the app never cares which provider backs a given client's data. Until real API keys are connected, adapters return clearly-flagged `is_mock: true` data — the UI must visibly label mock data so it's never confused with real client data.
- **AI layer is provider-agnostic.** A single `LLMClient` interface wraps whichever provider is configured; agents/services call this interface, never the provider SDK directly.

---

## 2. User Flows

### 2.1 Agency Admin/Owner
1. Sign up → create agency workspace → invite team members (Manager/Employee roles).
2. Add a client directly → add client contacts, retainer info, assign a Manager/Employee.
3. Add website(s) for the client → connect integrations (or use mock data in MVP).
4. Review Admin Dashboard → drill into any client's SEO Dashboard, Tasks, or Audits.
5. Generate/approve monthly reports → send to client (unlocks in Client Portal).

### 2.2 SEO Manager
1. Log in → see assigned clients only.
2. Review keyword movement and audit issues per client → create tasks, assign to Employees.
3. Monitor team workload → rebalance task assignments.
4. Approve reports before they go to the client.

### 2.3 SEO Employee/Specialist
1. Log in → "My Tasks" dashboard, sorted by deadline.
2. Open a task → see client/website context, comments, attachments → update status, log work.
3. Use AI Assistant to generate a content brief or explain a ranking drop → attach output to the task.
4. Mark task complete → activity logged, Manager notified.

### 2.4 Client (Client Portal)
1. Log in → sees only their own SEO score, traffic, rankings, completed work, current tasks, and reports.
2. Cannot see internal notes, other clients, employee assignments, or pricing/retainer internals.
3. Views monthly PDF reports, white-labeled with agency branding.

---

## 3. Feature Breakdown by Module (MVP vs Phase 2)

| Module | MVP | Phase 2 |
|---|---|---|
| Auth & Roles | Login, signup, JWT, RBAC middleware | SSO, 2FA |
| Client Management | CRUD, contacts, notes, status, retainer | Client health scoring |
| Website Management | CRUD, SEO score field, last audit date | Multi-domain grouping |
| SEO Dashboard | KPI cards + traffic/ranking charts (mock or live) | Custom widget builder |
| Keyword Management | CRUD, groups, ranking history table | Bulk CSV import, SERP volatility alerts |
| Task Management | CRUD, assignment, status, comments, attachments | Kanban board, recurring tasks |
| Website Audit | Rule-based issue list w/ severity | Automated crawler (Screaming Frog-style) |
| Reporting | PDF export, white-label template | Scheduled auto-send, branded portal themes |
| Client Portal | Read-only scoped dashboard | Client comments, approvals |
| Team Management | Assign roles/clients/tasks, workload view | Time tracking, capacity planning |
| AI Assistant | Ranking explanations, keyword/content suggestions, report summaries | Full autonomous audit triage |
| Integrations | Adapter interfaces + mock data | Live GSC/GA4/Semrush/Ahrefs connections |

---

## 4. Database Schema (PostgreSQL DDL)

```sql
-- ===== CORE / AUTH =====
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    white_label_logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL   -- admin, manager, employee, client
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    client_id UUID NULL REFERENCES clients(id),  -- set only for role=client
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CLIENTS =====
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',      -- active, paused, churned
    retainer_amount NUMERIC(10,2),
    retainer_cycle VARCHAR(20),                -- monthly, quarterly
    onboarded_at DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role_title VARCHAR(100),
    is_primary BOOLEAN DEFAULT false
);

CREATE TABLE client_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== WEBSITES =====
CREATE TABLE websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    seo_score INT,
    last_audit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== KEYWORDS & RANKINGS =====
CREATE TABLE keyword_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    name VARCHAR(255)
);

CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    group_id UUID REFERENCES keyword_groups(id),
    keyword VARCHAR(255) NOT NULL,
    search_volume INT,
    difficulty INT,
    intent VARCHAR(50),           -- informational, transactional, navigational, commercial
    target_page TEXT,
    status VARCHAR(50) DEFAULT 'tracking',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE keyword_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    rank_position INT,
    recorded_at DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'mock'   -- mock, semrush, ahrefs, gsc
);

-- ===== BACKLINKS =====
CREATE TABLE backlinks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    source_url TEXT,
    target_url TEXT,
    domain_authority INT,
    anchor_text VARCHAR(255),
    is_dofollow BOOLEAN,
    discovered_at DATE,
    source VARCHAR(50) DEFAULT 'mock'
);

-- ===== AUDITS =====
CREATE TABLE seo_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ DEFAULT now(),
    overall_score INT,
    triggered_by UUID REFERENCES users(id)
);

CREATE TABLE seo_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID REFERENCES seo_audits(id) ON DELETE CASCADE,
    issue_type VARCHAR(100),      -- broken_link, missing_title, duplicate_meta, etc.
    severity VARCHAR(20),         -- critical, high, medium, low
    affected_url TEXT,
    description TEXT,
    resolved BOOLEAN DEFAULT false
);

-- ===== TASKS / PROJECTS =====
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    website_id UUID REFERENCES websites(id),
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50),        -- keyword_research, content, technical, backlinks, onpage, local
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo',   -- todo, in_progress, review, done
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    file_url TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50),     -- task, client, website
    entity_id UUID,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== REPORTS =====
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    period_start DATE,
    period_end DATE,
    pdf_url TEXT,
    summary TEXT,
    status VARCHAR(20) DEFAULT 'draft',  -- draft, approved, sent
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== NOTIFICATIONS =====
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== AI =====
CREATE TABLE ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    client_id UUID REFERENCES clients(id),
    request_type VARCHAR(50),   -- ranking_explain, content_brief, competitor_analysis, summary
    input_payload JSONB,
    output_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== INTEGRATIONS =====
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    provider VARCHAR(50),        -- gsc, ga4, semrush, ahrefs, pagespeed, gbp, keyword_planner
    status VARCHAR(20) DEFAULT 'not_connected',  -- not_connected, connected, error
    credentials_encrypted TEXT,
    last_synced_at TIMESTAMPTZ
);
```

**Notes**
- All monetary/retainer fields live only on `clients` — never exposed via the client-facing API.
- `keyword_rankings` and `backlinks` carry a `source` column so mock vs. live data is always distinguishable at the row level, not just in the UI.
- `activities` is a generic audit-log table (entity_type + entity_id) rather than one log table per entity — keeps the schema from sprawling as new modules get added.
- No `leads`/`deals` tables — client onboarding is a direct `POST /clients` by Admin/Manager.

---

## 5. API Endpoint Design (REST, versioned under `/api/v1`)

```
AUTH
POST   /auth/signup
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

CLIENTS
GET    /clients                       (scoped: admin=all, manager/employee=assigned, client=self)
POST   /clients
GET    /clients/{id}
PATCH  /clients/{id}
DELETE /clients/{id}
POST   /clients/{id}/contacts
POST   /clients/{id}/notes
GET    /clients/{id}/activity

WEBSITES
GET    /clients/{id}/websites
POST   /clients/{id}/websites
GET    /websites/{id}
PATCH  /websites/{id}
DELETE /websites/{id}

SEO DASHBOARD
GET    /websites/{id}/seo-summary        -- traffic, clicks, impressions, CTR, avg position
GET    /websites/{id}/traffic-trend?range=30d

KEYWORDS
GET    /websites/{id}/keywords
POST   /websites/{id}/keywords
PATCH  /keywords/{id}
DELETE /keywords/{id}
GET    /keywords/{id}/ranking-history
POST   /websites/{id}/keyword-groups

AUDITS
POST   /websites/{id}/audits              -- trigger new audit
GET    /websites/{id}/audits
GET    /audits/{id}/issues
PATCH  /issues/{id}                       -- mark resolved

TASKS
GET    /tasks?client_id=&status=&assigned_to=
POST   /tasks
GET    /tasks/{id}
PATCH  /tasks/{id}
DELETE /tasks/{id}
POST   /tasks/{id}/comments
POST   /tasks/{id}/attachments

REPORTS
POST   /clients/{id}/reports/generate
GET    /clients/{id}/reports
GET    /reports/{id}
GET    /reports/{id}/pdf
PATCH  /reports/{id}                       -- approve / send

TEAM
GET    /team
POST   /team/invite
PATCH  /team/{user_id}/role
POST   /team/{user_id}/assign-client
GET    /team/{user_id}/workload

AI ASSISTANT
POST   /ai/explain-ranking-drop
POST   /ai/suggest-keywords
POST   /ai/content-brief
POST   /ai/competitor-analysis
POST   /ai/summarize-performance
POST   /ai/issue-to-task                  -- converts an seo_issue into a draft task

INTEGRATIONS
GET    /clients/{id}/integrations
POST   /clients/{id}/integrations/{provider}/connect
DELETE /clients/{id}/integrations/{provider}
POST   /clients/{id}/integrations/{provider}/sync

NOTIFICATIONS
GET    /notifications
PATCH  /notifications/{id}/read
```

Every endpoint enforces role + tenant scoping in a shared FastAPI dependency (`get_current_user` → `require_role([...])` → `scope_query_to_user`), not per-router ad hoc checks.

---

## 6. Frontend Page Structure (React Router)

```
/login
/signup

/dashboard                       (role-aware: renders Admin/Manager/Employee/Client view)

/clients
/clients/:clientId
/clients/:clientId/websites/:websiteId

/websites/:websiteId/seo
/websites/:websiteId/keywords
/websites/:websiteId/audits
/websites/:websiteId/audits/:auditId

/tasks
/tasks/:taskId

/reports
/reports/:reportId

/team
/team/:userId

/ai-assistant

/settings
/settings/integrations
/settings/billing
```

`ClientDashboard` re-uses `/dashboard` but the API layer transparently scopes data server-side — the frontend doesn't need a parallel route tree, just conditional rendering based on `user.role`.

---

## 7. Component Structure (frontend/src)

```
src/
├── app/
│   ├── App.tsx
│   ├── routes.tsx
│   └── ProtectedRoute.tsx
├── layouts/
│   ├── SidebarLayout.tsx
│   └── ClientPortalLayout.tsx
├── components/
│   ├── ui/                      # Button, Card, Modal, Table, Badge, Tabs
│   ├── charts/                  # TrafficTrendChart, RankingChart, KpiCard
│   ├── forms/                   # ClientForm, TaskForm, KeywordForm
│   └── nav/                     # Sidebar, TopBar, NotificationBell
├── features/
│   ├── auth/
│   ├── clients/                 # ClientList, ClientDetail, ClientNotes
│   ├── websites/
│   ├── seo-dashboard/
│   ├── keywords/                # KeywordTable, KeywordFilters
│   ├── audits/                  # IssueList, SeverityBadge
│   ├── tasks/                   # TaskBoard, TaskDetail, TaskComments
│   ├── reports/                 # ReportBuilder, ReportPreview
│   ├── team/
│   └── ai-assistant/            # ChatPanel, SuggestionCard
├── hooks/                       # useAuth, useClientScope, useApi
├── api/                         # typed API client per module (axios/fetch wrapper)
├── store/                       # auth/session state (React Query + light Zustand)
└── utils/
```

Charts use Recharts (bar/line for traffic & rankings, radial for SEO score). Tables share one generic `<DataTable>` with column config + filter/sort props, reused across Clients, Keywords, and Tasks.

---

## 8. Backend Folder Structure (FastAPI)

```
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py            # env vars, settings
│   │   ├── security.py          # JWT, password hashing
│   │   └── deps.py              # get_current_user, require_role, get_db
│   ├── db/
│   │   ├── session.py
│   │   └── base.py
│   ├── models/                  # SQLAlchemy models, one file per domain
│   │   ├── user.py
│   │   ├── client.py
│   │   ├── website.py
│   │   ├── keyword.py
│   │   ├── audit.py
│   │   ├── task.py
│   │   ├── report.py
│   │   └── ai.py
│   ├── schemas/                 # Pydantic request/response models (mirrors models/)
│   ├── routers/
│   │   ├── auth.py
│   │   ├── clients.py
│   │   ├── websites.py
│   │   ├── seo_dashboard.py
│   │   ├── keywords.py
│   │   ├── audits.py
│   │   ├── tasks.py
│   │   ├── reports.py
│   │   ├── team.py
│   │   ├── ai_assistant.py
│   │   ├── integrations.py
│   │   └── notifications.py
│   ├── services/                # business logic, one per domain (mirrors routers/)
│   ├── integrations/
│   │   ├── base.py              # abstract adapter interface
│   │   ├── gsc.py
│   │   ├── ga4.py
│   │   ├── semrush.py
│   │   ├── ahrefs.py
│   │   ├── pagespeed.py
│   │   └── mock_provider.py
│   ├── ai/
│   │   ├── llm_client.py        # provider-agnostic wrapper
│   │   ├── prompts/             # one template file per AI task
│   │   └── ai_service.py
│   └── utils/
├── alembic/                     # migrations
├── tests/
├── requirements.txt
└── .env.example
```

---

## 9. Database Models (SQLAlchemy — representative sample)

```python
# app/models/client.py
import uuid
from sqlalchemy import Column, String, ForeignKey, Numeric, Date, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agency_id = Column(UUID(as_uuid=True), ForeignKey("agencies.id"), nullable=False)
    company_name = Column(String(255), nullable=False)
    status = Column(String(50), default="active")
    retainer_amount = Column(Numeric(10, 2))
    retainer_cycle = Column(String(20))
    onboarded_at = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    websites = relationship("Website", back_populates="client", cascade="all, delete-orphan")
    contacts = relationship("ClientContact", back_populates="client", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="client")
```

```python
# app/models/task.py
import uuid
from sqlalchemy import Column, String, ForeignKey, Date, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    website_id = Column(UUID(as_uuid=True), ForeignKey("websites.id"))
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    category = Column(String(50))
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="todo")
    deadline = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("Client", back_populates="tasks")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
```

The remaining models (`Website`, `Keyword`, `KeywordRanking`, `Backlink`, `SEOAudit`, `SEOIssue`, `Report`, `Notification`, `AIRequest`, `Integration`) follow the same pattern: one class per table in `models/`, matched 1:1 by a Pydantic schema in `schemas/`.

---

## 10. Authentication & Authorization Design

- **Auth:** JWT access token (short-lived, ~15 min) + refresh token (httpOnly cookie, ~7 days). `passlib[bcrypt]` for password hashing.
- **RBAC:** Four roles (`admin`, `manager`, `employee`, `client`) stored in `roles`, referenced by `users.role_id`. A FastAPI dependency `require_role(["admin", "manager"])` guards routes.
- **Tenant isolation:** Every service function that touches client data takes the authenticated user and filters by `agency_id` (agency staff) or `client_id` (client role) before hitting the DB — never trust IDs from the request path alone without this check.
- **Client role specifics:** `users.client_id` is set only for `role=client`; middleware rejects any request to non-client-scoped endpoints for that role, and the service layer additionally strips internal-only fields (retainer amount, internal notes, other clients' data) from any response reachable by a client token, as defense in depth.
- **Secrets:** All API keys (LLM provider, Semrush, Ahrefs, Google APIs) loaded via environment variables through `core/config.py` (Pydantic `BaseSettings`), never committed, never returned in API responses. Integration credentials in the `integrations` table are stored encrypted at rest.

---

## 11. MVP Implementation Roadmap (solo developer pacing)

**Phase 1 — Foundation**
- Repo scaffolding, PostgreSQL + Alembic setup
- Auth (signup/login/JWT), roles, protected routes, base layout with sidebar ✅ *already built and tested*

**Phase 2 — Core Data Layer**
- Client management (CRUD, contacts, notes) ✅ *already built and tested*
- Website management (CRUD) — next up
- Team management (invite, assign roles/clients)

**Phase 3 — SEO Core**
- Keyword management + ranking history (mock data generator)
- SEO Dashboard (KPI cards, traffic trend chart) fed by mock/integration adapter
- Basic rule-based audit engine + issue list with severity

**Phase 4 — Workflow**
- Task management (CRUD, comments, attachments, assignment)
- Notifications (task assigned, deadline approaching, report ready)

**Phase 5 — Reporting & Client Portal**
- Report generation (data aggregation → PDF via WeasyPrint/Playwright)
- White-label branding config per agency
- Client Portal (scoped dashboard, reports view)

**Phase 6 — AI Assistant**
- Ranking-drop explanation, keyword suggestions, content briefs, performance summary — via the LLM abstraction

**Phase 7 — Hardening**
- Security review (RBAC edge cases, tenant-isolation tests)
- Live integration adapters for GSC/GA4 (read-only) behind feature flags
- Bug bash, deployment pipeline, staging → production cutover

Removing CRM doesn't just delete a phase — it also means Phase 2 no longer depends on a working pipeline before clients exist, so Client → Website → SEO Dashboard can be built and demoed as one clean vertical slice before anything else.

---

## 12. Example Dashboard Layouts (wireframe-level)

**Admin Dashboard**
```
┌─ Sidebar ───┬─────────────────────────────────────────────┐
│ Dashboard   │  [Total Clients] [Active Sites] [Avg SEO▲]   │
│ Clients     │  [Organic Traffic] [Kw Improving/Declining]  │
│ Websites    │  [Pending Tasks] [Overdue] [Retainers $]     │
│ SEO         │  ────────────────────────────────────────    │
│ Keywords    │  Traffic Trend (line chart, all clients)     │
│ Audits      │  ────────────────────────────────────────    │
│ Tasks       │  Recent Activity Feed                        │
│ Reports     │                                               │
│ Team        │                                               │
│ AI Assistant│                                               │
│ Settings    │                                               │
└─────────────┴─────────────────────────────────────────────┘
```

**Client Dashboard** (same shell, no Team/internal nav items, KPI cards limited to SEO score, traffic, keyword performance, completed work, current tasks, reports, recommendations).

---

## 13. Sample Data (development seed)

```json
{
  "client": {
    "company_name": "GreenLeaf Landscaping",
    "status": "active",
    "retainer_amount": 1200.00,
    "retainer_cycle": "monthly"
  },
  "website": {
    "domain": "greenleaflandscaping.com",
    "seo_score": 74
  },
  "keywords": [
    {"keyword": "landscaping services near me", "search_volume": 2400, "difficulty": 58, "rank_position": 6, "source": "mock"},
    {"keyword": "lawn care packages", "search_volume": 880, "difficulty": 41, "rank_position": 12, "source": "mock"}
  ],
  "task": {
    "title": "Fix duplicate meta descriptions on service pages",
    "category": "technical",
    "priority": "high",
    "status": "todo"
  },
  "issue": {
    "issue_type": "missing_meta_description",
    "severity": "high",
    "affected_url": "/services/lawn-care"
  }
}
```

All seed generators live in `backend/app/db/seed.py` and are explicitly tagged `source="mock"` so they can never be mistaken for live client data in demos.

---

## 14. Production Considerations

- **Data isolation testing:** automated tests that assert a client-role token can never retrieve another client's row, across every endpoint — already verified for the Clients module; extend the same pattern to every new module as it's built.
- **Rate limiting & abuse protection** on AI endpoints specifically (cost control — LLM calls are the one part of this stack with a real per-request dollar cost).
- **PDF report generation** should run as a background job (Celery/RQ or FastAPI `BackgroundTasks` for MVP scale) rather than blocking the request.
- **Audit trail immutability:** `activities` table should be append-only; don't allow updates/deletes from the application layer.
- **Observability:** structured logging + request IDs from day one, since debugging "why does this client see stale data" issues without them is painful in a multi-tenant system.
- **Backups:** PostgreSQL point-in-time recovery enabled before any real client data goes in.
- **Integration key rotation:** encrypted credential storage plus a documented rotation path per provider.
- **Scaling path:** if audit crawling or AI usage grows heavy, split `integrations` (crawler) and `ai` into separate worker services behind a queue — the modular monolith boundaries were chosen specifically so this split doesn't require a rewrite.

---

## What's already built vs. what's next

**Built and tested** (see the backend scaffold): Auth (signup/login/JWT/RBAC), Client CRUD with full tenant-isolation verification.

**Next in line:** Website CRUD (model already exists, needs router + service — same pattern as Clients), then Keywords + mock ranking generator so the SEO Dashboard has real data to render against.
