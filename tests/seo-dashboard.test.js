import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["manager-auth", { id: "user-1", agencyId: "agency-1", email: "manager@sldm.test", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["client-auth", { id: "user-2", agencyId: "agency-1", email: "client@sldm.test", isActive: true, role: { name: roles.CLIENT }, clientId: "client-1", assignments: [] }],
      ["other-manager", { id: "user-3", agencyId: "agency-2", email: "other@sldm.test", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-9" }] }],
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

class MemorySeoDashboardRepository {
  async findWebsiteDashboard(websiteId) {
    if (websiteId !== "website-1") return null;
    const oldDate = new Date("2026-08-01T00:00:00.000Z");
    const newDate = new Date("2026-08-30T00:00:00.000Z");
    return {
      id: "website-1",
      clientId: "client-1",
      domain: "example.com",
      seoScore: 84,
      isMock: true,
      client: { id: "client-1", agencyId: "agency-1", companyName: "Example Co" },
      pageMetrics: [
        { url: "/", clicks: 80, impressions: 1000, ctr: 0.08, avgPosition: 12.4, organicSessions: 420, recordedAt: oldDate },
        { url: "/", clicks: 40, impressions: 500, ctr: 0.08, avgPosition: 10, organicSessions: 190, recordedAt: newDate },
        { url: "/services", clicks: 120, impressions: 1500, ctr: 0.08, avgPosition: 8.7, organicSessions: 610, recordedAt: newDate },
      ],
      keywords: [
        { keyword: "seo agency", rankings: [{ rankPosition: 12, recordedAt: oldDate }, { rankPosition: 7, recordedAt: newDate }] },
        { keyword: "rank tracking", rankings: [{ rankPosition: 5, recordedAt: oldDate }, { rankPosition: 9, recordedAt: newDate }] },
      ],
      audits: [
        { id: "audit-1", runAt: newDate, overallScore: 82, issues: [{ severity: "high", resolved: false }, { severity: "medium", resolved: false }, { severity: "low", resolved: true }] },
      ],
      backlinks: [{ discoveredAt: newDate }, { discoveredAt: oldDate }],
      tasks: [
        { id: "task-1", title: "Fix titles", status: "todo", deadline: new Date("2026-08-15T00:00:00.000Z") },
        { id: "task-2", title: "Publish page", status: "done", deadline: newDate },
      ],
      competitors: [
        { name: "Competitor A", domain: "a.test", keywords: [{ keyword: "seo agency", rankPosition: 8, recordedAt: oldDate }, { keyword: "seo agency", rankPosition: 4, recordedAt: newDate }, { keyword: "rank tracking", rankPosition: 10, recordedAt: newDate }] },
        { name: "Competitor B", domain: "b.test", keywords: [{ keyword: "seo agency", rankPosition: 20, recordedAt: newDate }, { keyword: "rank tracking", rankPosition: 30, recordedAt: newDate }] },
      ],
    };
  }
}

function makeApp() {
  return createApp({
    userRepository: new MemoryUserRepository(),
    authProvider: new FakeSupabaseAuthProvider(),
    seoDashboardRepository: new MemorySeoDashboardRepository(),
  });
}

describe("SEO dashboard routes", () => {
  it("returns per-website KPI, trend, top page, and share-of-voice data", async () => {
    const response = await request(makeApp())
      .get("/api/v1/websites/website-1/seo-dashboard")
      .set("Authorization", "Bearer manager-auth");

    expect(response.status).toBe(200);
    expect(response.body.audience).toBe("internal");
    expect(response.body.kpis).toMatchObject({ organicTraffic: 800, clicks: 160, impressions: 2000, seoScore: 84, backlinks: 2 });
    expect(response.body.kpis.rankingMovement).toMatchObject({ improved: 1, declined: 1, top10: 2 });
    expect(response.body.trends.traffic).toHaveLength(2);
    expect(response.body.trends.ranking).toHaveLength(2);
    expect(response.body.trends.distribution).toHaveLength(5);
    expect(response.body.trends.keywordMovement).toEqual([
      { date: "2026-08-30", improved: 1, declined: 1, unchanged: 0 },
    ]);
    expect(response.body.topPages[0].url).toBe("/services");
    expect(response.body.topPages).toHaveLength(2);
    expect(response.body.topKeywords[0]).toMatchObject({ keyword: "seo agency", position: 7, change: 5 });
    expect(response.body.shareOfVoice.length).toBe(3);
    expect(response.body.operations.openTasks).toHaveLength(1);
  });

  it("provides dedicated scoped summary and traffic trend endpoints", async () => {
    const app = makeApp();
    const [summary, traffic] = await Promise.all([
      request(app).get("/api/v1/websites/website-1/seo-dashboard/summary").set("Authorization", "Bearer manager-auth"),
      request(app).get("/api/v1/websites/website-1/seo-dashboard/traffic-trend").set("Authorization", "Bearer client-auth"),
    ]);

    expect(summary.status).toBe(200);
    expect(summary.body.kpis.organicTraffic).toBe(800);
    expect(summary.body.trends).toBeUndefined();
    expect(traffic.status).toBe(200);
    expect(traffic.body.audience).toBe("client");
    expect(traffic.body.traffic.at(-1)).toMatchObject({ clicks: 160, impressions: 2000, organicTraffic: 800 });
    expect(traffic.body.operations).toBeUndefined();
  });

  it("returns a client-safe dashboard without internal operations data", async () => {
    const response = await request(makeApp())
      .get("/api/v1/websites/website-1/seo-dashboard")
      .set("Authorization", "Bearer client-auth");

    expect(response.status).toBe(200);
    expect(response.body.audience).toBe("client");
    expect(response.body.operations).toBeUndefined();
    expect(response.body.kpis.tasks.open).toBe(1);
  });

  it("blocks cross-tenant dashboard access", async () => {
    const response = await request(makeApp())
      .get("/api/v1/websites/website-1/seo-dashboard")
      .set("Authorization", "Bearer other-manager");

    expect(response.status).toBe(404);
  });
});
