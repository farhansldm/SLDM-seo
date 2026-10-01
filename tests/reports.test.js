import path from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { renderReportHtml } from "../server/services/reportPdfService.js";
import { roles } from "../shared/permissions.js";

const start = new Date("2026-08-01T00:00:00.000Z");
const end = new Date("2026-08-31T23:59:59.000Z");

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["admin-auth", { id: "admin-1", agencyId: "agency-1", email: "admin@test.dev", isActive: true, role: { name: roles.ADMIN }, assignments: [] }],
      ["manager-auth", { id: "manager-1", agencyId: "agency-1", email: "manager@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["client-auth", { id: "client-user", agencyId: "agency-1", clientId: "client-1", email: "client@test.dev", isActive: true, role: { name: roles.CLIENT }, assignments: [] }],
      ["employee-auth", { id: "employee-1", agencyId: "agency-1", email: "employee@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["other-auth", { id: "manager-9", agencyId: "agency-9", email: "other@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-9" }] }],
    ]);
  }
  async findUserByAuthToken(id) { return this.users.get(id) ?? null; }
}

class FakeSessionProvider {
  async verifySessionToken(token) { return { id: token }; }
}

function reportClientData() {
  return {
    id: "client-1",
    agencyId: "agency-1",
    companyName: "Acme Tools",
    status: "active",
    websites: [{
      id: "website-1", domain: "acme.test", seoScore: 84, isMock: true,
      pageMetrics: [
        { recordedAt: new Date("2026-08-10"), url: "/", organicSessions: 400, clicks: 80, impressions: 1000, avgPosition: 12 },
        { recordedAt: new Date("2026-08-20"), url: "/", organicSessions: 600, clicks: 120, impressions: 1500, avgPosition: 8 },
      ],
      keywords: [
        { keyword: "seo tools", rankings: [{ recordedAt: new Date("2026-08-10"), rankPosition: 12 }, { recordedAt: new Date("2026-08-20"), rankPosition: 6 }] },
        { keyword: "rank tracker", rankings: [{ recordedAt: new Date("2026-08-10"), rankPosition: 4 }, { recordedAt: new Date("2026-08-20"), rankPosition: 7 }] },
      ],
      audits: [{ runAt: new Date("2026-08-25"), overallScore: 82, issues: [{ severity: "high", resolved: false, description: "Missing titles", affectedUrl: "/services" }, { severity: "low", resolved: true, description: "Alt text fixed", affectedUrl: "/" }] }],
      backlinks: [{ id: "backlink-1" }, { id: "backlink-2" }],
    }],
    tasks: [
      { id: "task-1", title: "Fix canonical tags", status: "done", priority: "high", createdAt: new Date("2026-08-05"), deadline: new Date("2026-08-15") },
      { id: "task-2", title: "Rewrite service page", status: "in_progress", priority: "high", createdAt: new Date("2026-08-12"), deadline: new Date("2026-09-05") },
    ],
    contentBriefs: [{ title: "SEO tools comparison", targetKeyword: "best seo tools", status: "draft" }],
  };
}

class MemoryReportRepository {
  constructor() {
    this.clients = new Map([
      ["client-1", reportClientData()],
      ["client-9", { ...reportClientData(), id: "client-9", agencyId: "agency-9", companyName: "Other Co", websites: [], tasks: [], contentBriefs: [] }],
    ]);
    this.reports = [];
    this.activities = [];
  }

  hydrate(report) { return { ...report, client: this.clients.get(report.clientId) }; }
  async getClientReportData(id) { return this.clients.get(id) ?? null; }
  async findClientById(id) { return this.clients.get(id) ?? null; }
  async createReport(data) { const report = { id: `report-${this.reports.length + 1}`, createdAt: new Date(), updatedAt: new Date(), pdfUrl: null, approvedAt: null, approvedBy: null, ...data }; this.reports.push(report); return this.hydrate(report); }
  async findReportById(id) { const report = this.reports.find((item) => item.id === id); return report ? this.hydrate(report) : null; }
  async updateReport(id, data) { const report = this.reports.find((item) => item.id === id); Object.assign(report, data, { updatedAt: new Date() }); return this.hydrate(report); }
  async createActivity(data) { this.activities.push(data); return data; }
  async listReports(where) {
    return this.reports.filter((report) => {
      if (where.client?.agencyId && this.clients.get(report.clientId)?.agencyId !== where.client.agencyId) return false;
      if (where.clientId?.in && !where.clientId.in.includes(report.clientId)) return false;
      if (typeof where.clientId === "string" && report.clientId !== where.clientId) return false;
      return !where.status || report.status === where.status;
    }).map((report) => this.hydrate(report));
  }
}

class FakePdfService {
  constructor() { this.generated = []; }
  async generate(report) { this.generated.push(report.id); return { pdfUrl: `/api/v1/reports/${report.id}/download`, outputPath: this.filePath(report.id) }; }
  async exists() { return true; }
  filePath() { return path.resolve("package.json"); }
}

function makeApp(repository = new MemoryReportRepository(), pdfService = new FakePdfService()) {
  return {
    app: createApp({ userRepository: new MemoryUserRepository(), sessionProvider: new FakeSessionProvider(), reportRepository: repository, reportPdfService: pdfService }),
    repository,
    pdfService,
  };
}

async function createDraft(app) {
  return request(app).post("/api/v1/reports").set("Authorization", "Bearer manager-auth").send({ clientId: "client-1", periodStart: start.toISOString(), periodEnd: end.toISOString() });
}

describe("reports and client portal", () => {
  it("creates a frozen report snapshot with all required SEO sections", async () => {
    const setup = makeApp();
    const response = await createDraft(setup.app);

    expect(response.status).toBe(201);
    expect(response.body.report).toMatchObject({ status: "draft", clientId: "client-1", generatedBy: "manager-1" });
    expect(response.body.report.reportData.performance).toMatchObject({ organicTraffic: 1000, clicks: 200, impressions: 2500 });
    expect(response.body.report.reportData.keywords).toMatchObject({ improved: 1, declined: 1 });
    expect(response.body.report.reportData.technicalHealth).toMatchObject({ averageScore: 82, openIssues: 1 });
    expect(response.body.report.reportData.tasks.completed).toBe(1);
    expect(response.body.report.reportData.backlinks.newLinks).toBe(2);
    expect(response.body.report.reportData.recommendations.length).toBeGreaterThan(0);
    expect(setup.repository.activities[0].action).toBe("report.created");
  });

  it("approves only after PDF generation and exposes the report to its client", async () => {
    const setup = makeApp();
    const draft = await createDraft(setup.app);
    const reportId = draft.body.report.id;

    const hidden = await request(setup.app).get(`/api/v1/reports/${reportId}`).set("Authorization", "Bearer client-auth");
    const approved = await request(setup.app).patch(`/api/v1/reports/${reportId}/approve`).set("Authorization", "Bearer manager-auth");
    const visible = await request(setup.app).get(`/api/v1/reports/${reportId}`).set("Authorization", "Bearer client-auth");
    const download = await request(setup.app).get(`/api/v1/reports/${reportId}/download`).set("Authorization", "Bearer client-auth");

    expect(hidden.status).toBe(404);
    expect(approved.body.report).toMatchObject({ status: "approved", approvedBy: "manager-1" });
    expect(approved.body.report.approvedAt).toBeTruthy();
    expect(setup.pdfService.generated).toEqual([reportId]);
    expect(visible.status).toBe(200);
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("attachment");
  });

  it("returns a client-safe portal with approved reports and no internal operations fields", async () => {
    const setup = makeApp();
    const draft = await createDraft(setup.app);
    await request(setup.app).patch(`/api/v1/reports/${draft.body.report.id}/approve`).set("Authorization", "Bearer manager-auth");

    const portal = await request(setup.app).get("/api/v1/portal/dashboard").set("Authorization", "Bearer client-auth");

    expect(portal.status).toBe(200);
    expect(portal.body).toMatchObject({ audience: "client", client: { companyName: "Acme Tools" } });
    expect(portal.body.approvedReports).toHaveLength(1);
    expect(portal.body.currentPriorities[0]).not.toHaveProperty("assignedTo");
    expect(portal.body).not.toHaveProperty("operations");
  });

  it("enforces report permissions and tenant isolation", async () => {
    const setup = makeApp();
    const draft = await createDraft(setup.app);
    const employee = await request(setup.app).get("/api/v1/reports").set("Authorization", "Bearer employee-auth");
    const otherTenant = await request(setup.app).get(`/api/v1/reports/${draft.body.report.id}`).set("Authorization", "Bearer other-auth");
    const internalPortal = await request(setup.app).get("/api/v1/portal/dashboard").set("Authorization", "Bearer manager-auth");

    expect(employee.status).toBe(403);
    expect(otherTenant.status).toBe(404);
    expect(internalPortal.status).toBe(403);
  });

  it("rejects invalid reporting periods", async () => {
    const { app } = makeApp();
    const response = await request(app).post("/api/v1/reports").set("Authorization", "Bearer manager-auth").send({ clientId: "client-1", periodStart: end, periodEnd: start });
    expect(response.status).toBe(422);
  });

  it("renders escaped, self-contained report HTML for Puppeteer", async () => {
    const setup = makeApp();
    const draft = await createDraft(setup.app);
    const html = renderReportHtml({ ...draft.body.report, title: "SEO <Report>" });
    expect(html).toContain("SEO &lt;Report&gt;");
    expect(html).toContain("Organic Traffic");
    expect(html).not.toContain("<script");
  });
});
