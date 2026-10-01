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

  async createQueuedCrawlRun(input) {
    const run = {
      id: `run-${this.runs.length + 1}`,
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      source: input.source,
      triggeredBy: input.triggeredBy,
      status: "queued",
      startedAt: null,
      completedAt: null,
      totalUrls: 0,
      website: this.websites.get(input.websiteId),
      crawledUrls: [],
    };
    this.runs.push(run);
    return run;
  }

  async completeCrawlRun(input) {
    const run = this.runs.find((item) => item.id === input.crawlRunId);
    const completedAt = new Date();
    Object.assign(run, {
      status: "completed",
      startedAt: completedAt,
      completedAt,
      totalUrls: input.crawledUrls.length,
      crawledUrls: input.crawledUrls.map((url, urlIndex) => ({
        id: `url-${this.runs.length + 1}-${urlIndex}`,
        ...url,
        checks: url.checks.map((check, checkIndex) => ({ id: `check-${run.id}-${urlIndex}-${checkIndex}`, crawlRunId: run.id, ...check })),
      })),
    });
    const audit = { id: `audit-${this.audits.length + 1}`, runAt: new Date(), ...input, issues: input.issues.map((issue, index) => ({ id: `issue-${index}`, ...issue })) };
    this.audits.push(audit);
    return { crawlRun: run, seoAudit: audit };
  }

  async failCrawlRun(crawlRunId) {
    const run = this.runs.find((item) => item.id === crawlRunId);
    Object.assign(run, { status: "failed", completedAt: new Date() });
    return run;
  }

  async updateTechnicalCheck(checkId, data) {
    const check = await this.findTechnicalCheck(checkId);
    Object.assign(check, data);
    for (const run of this.runs) {
      for (const crawledUrl of run.crawledUrls) {
        const stored = crawledUrl.checks.find((item) => item.id === checkId);
        if (stored) Object.assign(stored, data);
      }
    }
    return check;
  }

  async createTaskFromCheck(input) {
    const task = { id: `task-${this.tasks.length + 1}`, ...input, status: "todo", category: "technical_seo" };
    this.tasks.push(task);
    return task;
  }
}

function makeApp(repository = new MemoryAuditRepository(), options = {}) {
  return {
    app: createApp({ userRepository: new MemoryUserRepository(), authProvider: new FakeSupabaseAuthProvider(), auditRepository: repository, ...options }),
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

  it("persists a queued run before dispatching it to the Node worker", async () => {
    const repository = new MemoryAuditRepository();
    const jobs = [];
    const auditDispatcher = { dispatch: async (job) => jobs.push(job) };
    const { app } = makeApp(repository, { auditDispatcher });

    const response = await request(app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({ queued: true, crawlRun: { status: "queued", totalUrls: 0 } });
    expect(response.body.summary.score).toBeNull();
    expect(jobs).toEqual([{ crawlRunId: response.body.crawlRun.id, websiteId: "website-1", triggeredBy: "user-2" }]);
  });

  it("marks the crawl run failed when queue dispatch fails", async () => {
    const repository = new MemoryAuditRepository();
    const auditDispatcher = { dispatch: async () => { throw new Error("Redis unavailable"); } };
    const { app } = makeApp(repository, { auditDispatcher });

    const response = await request(app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");

    expect(response.status).toBe(500);
    expect(repository.runs[0].status).toBe("failed");
  });

  it("creates a task from an audit issue", async () => {
    const setup = makeApp();
    const audit = await request(setup.app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");
    const check = audit.body.crawlRun.crawledUrls.flatMap((url) => url.checks)[0];

    const task = await request(setup.app).post(`/api/v1/technical-checks/${check.id}/create-task`).set("Authorization", "Bearer manager-auth");

    expect(task.status).toBe(201);
    expect(task.body.task).toMatchObject({ category: "technical_seo", status: "todo", websiteId: "website-1" });
  });

  it("resolves and reopens an audit issue", async () => {
    const setup = makeApp();
    const audit = await request(setup.app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer manager-auth");
    const check = audit.body.crawlRun.crawledUrls.flatMap((url) => url.checks)[0];

    const resolved = await request(setup.app)
      .patch(`/api/v1/technical-checks/${check.id}/resolution`)
      .set("Authorization", "Bearer manager-auth")
      .send({ resolved: true });
    const reopened = await request(setup.app)
      .patch(`/api/v1/technical-checks/${check.id}/resolution`)
      .set("Authorization", "Bearer manager-auth")
      .send({ resolved: false });

    expect(resolved.status).toBe(200);
    expect(resolved.body.check).toMatchObject({ status: "resolved" });
    expect(resolved.body.check.resolvedAt).toBeTruthy();
    expect(reopened.status).toBe(200);
    expect(reopened.body.check).toMatchObject({ status: "open", resolvedAt: null });
  });

  it("blocks clients from audit internals and blocks cross-tenant access", async () => {
    const { app } = makeApp();

    const client = await request(app).get("/api/v1/websites/website-1/audits").set("Authorization", "Bearer client-auth");
    const otherTenant = await request(app).post("/api/v1/websites/website-1/audits/run").set("Authorization", "Bearer other-auth");

    expect(client.status).toBe(403);
    expect(otherTenant.status).toBe(404);
  });
});
