# Staging Deployment Checklist

## Platform

- [ ] Use a hosting plan that supports a persistent Node.js process; configure `npm run build` and start `node server/index.js`.
- [ ] Serve `dist/` through the hosting web server and proxy `/api/v1` to the Node.js API.
- [ ] Use Node.js 22 LTS or newer and install production dependencies with the lockfile.
- [ ] Set `NODE_ENV=production`, HTTPS, a real public API URL, and the exact production origin in `CORS_ORIGINS`.
- [ ] Keep the API, PostgreSQL database, and optional Redis service in compatible regions.

## Data And Auth

- [ ] Provision PostgreSQL and set `DATABASE_URL` with a least-privilege application user.
- [ ] Back up PostgreSQL before deployment and configure automated daily backups with a tested restore procedure.
- [ ] Run `npm run prisma:validate`, `npm run prisma:generate`, and `npx prisma migrate deploy` against staging.
- [ ] For migrated users, set `AUTH_USER_EMAIL` and `AUTH_USER_PASSWORD`, run `npm run auth:set-password`, then remove those temporary environment values.
- [ ] Configure secure PostgreSQL-backed session settings and verify login cookies are `Secure`, `HttpOnly`, and `SameSite=Strict` over HTTPS.
- [ ] Verify Admin, Manager, Employee, and Client access using separate staging accounts.
- [ ] Confirm tenant-isolation tests pass before every production migration.

## Jobs, Reports, And AI

- [ ] Use `JOB_MODE=redis` with managed Redis for multi-process hosting; run `npm run worker:audit` as a separately monitored process.
- [ ] Make `REPORT_STORAGE_DIR` persistent or replace local report storage with object storage before horizontal scaling.
- [ ] Install a Chromium-compatible browser and set `PUPPETEER_EXECUTABLE_PATH` if the host does not provide one automatically.
- [ ] Start with `AI_PROVIDER=mock` for staging workflow checks; switch to `openai` only after setting `OPENAI_API_KEY` in the host secret manager.
- [ ] Confirm `OPENAI_MODEL`, request timeout, and AI rate limits match the approved cost and capacity policy.
- [ ] Verify AI output remains internal until a Manager or Admin approves it.

## Security And Operations

- [ ] Store secrets only in the hosting environment; never upload `.env` or expose server keys through `VITE_*` variables.
- [ ] Restrict database and Redis network access to the application and worker hosts.
- [ ] Add process supervision, automatic restart, centralized logs, uptime checks, and alerts for API, worker, database, Redis, and integration failures.
- [ ] Put the API behind a trusted reverse proxy with request size limits, TLS, and edge rate limiting.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm audit --omit=dev` on the release artifact.
- [ ] Smoke test login, client scoping, keywords, dashboards, audits, tasks, AI review, report approval, PDF download, and the client portal.
- [ ] Document rollback: retain the previous frontend artifact, API release, database backup, and migration recovery steps.
