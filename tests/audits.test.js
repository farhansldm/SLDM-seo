import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["admin-auth", { id: "user-1", agencyId: "agency-1", email: "admin@sldm.test", isActive: true, role: { name: roles.ADMIN }, assignments: [] }],
      ["manager-auth", { id: "user-2", agencyId: "agency-1", email: "manager@sldm.test", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["employee-auth", { id: "user-3", agencyId: "agency-1", email: "employee@sldm.test", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["client-auth", { id: "user-4", agencyId: "agency-1", email: "client@sldm.test", isActive: true, role: { name: roles.CLIENT }, clientId: "client-1", assignments: [] }],
      ["other-auth", { id: "user-5", agencyId: "agency-2", email: "other@sldm.test", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-9" }] }],
    ]);
  }

  async findUserBySupabaseAuthId(id) {
    return this.users.get(id) ?? null;
  }
}

class FakeSupabaseAuthProvider {
  async verifyAccessToken(token) {
    return { id: token, email: `${token}@sldm.test` };
  }
}

class MemoryAuditRepository {
  constructor() {
    this.websites = new Map([
      ["website-1", { id: "website-1", clientId: "client-1", domain: "example.com", client: { id: "client-1", agencyId: "agency-1" } }],
      ["website-9", { id: "website-9", clientId: "client-9", domain: "other.com", client: { id: "client-9", agencyId: "agency-2" } }],
    ]);
    this.runs = [];
    this.audits = [];
    this.tasks = [];
  }

  async findWebsiteById(websiteId) {
    return this.websites.get(websiteId) ?? null;
  }

  async listCrawlRuns(websiteId) {
    return this.runs.filter((run) => run.websiteId === websiteId).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  async findCrawlRun(crawlRunId) {
    return this.runs.find((run) => run.id === crawlRunId) ?? null;
  }

  async findTechnicalCheck(checkId) {
    for (const run of this.runs) {
      for (const crawledUrl of run.crawledUrls) {
        const check = crawledUrl.checks.find((item) => item.id === checkId);
        if (check) return { ...check, crawledUrl: { ...crawledUrl, crawlRun: run } };
      }
    }
    return null;
  }

  async createCrawlRun(input) {
    const startedAt = new Date(Date.now() + this.runs.length * 1000);
    const run = {
      id: `run-${this.runs.length + 1}`,
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      source: input.source,
      triggeredBy: input.triggeredBy,
      status: "completed",
      startedAt,
      completedAt: startedAt,
      totalUrls: input.totalUrls,
      website: this.websites.get(input.websiteId),
      crawledUrls: input.crawledUrls.map((url, urlIndex) => ({
        id: `url-${this.runs.length + 1}-${urlIndex}`,
        ...url,
        checks: url.checks.map((check, checkIndex) => ({ id: `check-${this.runs.length + 1}-${urlIndex}-${checkIndex}`, crawlRunId: `run-${this.runs.length + 1}`, ...check })),
      })),
    };
    this.runs.push(run);
    return run;
  }

  async createSeoAudit(input) {
    const audit = { id: `audit-${this.audits.length + 1}`, runAt: new Date(), ...input, issues: input.issues.map((issue, index) => ({ id: `issue-${index}`, ...issue })) };
    this.audits.push(audit);
    return audit;
  }

  async createTaskFromCheck(input) {
    const task = { id: `task-${this.tasks.length + 1}`, ...input, status: "todo", category: "technical_seo" };
    this.tasks.push(task);
    return task;
  }
}

function makeApp(repository = new MemoryAuditRepository()) {
  return {
    app: createApp({ userRepository: new MemoryUserRepository(), authProvider: new FakeSupabaseAuthProvider(), auditRepository: repository }),
    repository,
  };
}

describe("technical audit routes", () => {
  it("runs a mock technical audit and detects URL-level issues", async () => {
    const { app } = makeApp();

    const response = await request(app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");

    expect(response.status).toBe(201);
    expect(response.body.summary.totalUrls).toBe(5);
    expect(response.body.summary.checks.total).toBeGreaterThan(10);
    expect(response.body.summary.checks.critical).toBeGreaterThan(0);
    expect(response.body.seoAudit.overallScore).toBeLessThan(100);
    expect(response.body.crawlRun.crawledUrls.flatMap((url) => url.checks).map((check) => check.checkType)).toEqual(expect.arrayContaining(["broken_link", "missing_title", "missing_meta_description", "slow_page", "canonical_problem"]));
  });

  it("returns crawl history and comparison after multiple runs", async () => {
    const setup = makeApp();
    await request(setup.app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");
    const second = await request(setup.app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");
    const history = await request(setup.app).get("/api/v1/websites/website-1/audits").set("Authorization", "Bearer employee-auth");

    expect(second.body.comparison).toMatchObject({ issueDelta: 0, criticalDelta: 0 });
    expect(history.status).toBe(200);
    expect(history.body.runs).toHaveLength(2);
  });

  it("creates a task from an audit issue", async () => {
    const setup = makeApp();
    const audit = await request(setup.app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");
    const check = audit.body.crawlRun.crawledUrls.flatMap((url) => url.checks)[0];

    const task = await request(setup.app).post(`/api/v1/technical-checks/${check.id}/create-task`).set("Authorization", "Bearer manager-auth");

    expect(task.status).toBe(201);
    expect(task.body.task).toMatchObject({ category: "technical_seo", status: "todo", websiteId: "website-1" });
  });

  it("blocks clients from audit internals and blocks cross-tenant access", async () => {
    const { app } = makeApp();

    const client = await request(app).get("/api/v1/websites/website-1/audits").set("Authorization", "Bearer client-auth");
    const otherTenant = await request(app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer other-auth");

    expect(client.status).toBe(403);
    expect(otherTenant.status).toBe(404);
  });
});
