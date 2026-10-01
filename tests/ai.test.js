import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { SlidingWindowRateLimiter } from "../server/middleware/rateLimit.js";
import { roles } from "../shared/permissions.js";

const workflows = ["keyword_expansion", "backlink_prospects", "ranking_explanation", "content_brief", "audit_summary", "report_summary"];

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["admin-auth", { id: "admin-1", agencyId: "agency-1", email: "admin@test.dev", isActive: true, role: { name: roles.ADMIN }, assignments: [] }],
      ["manager-auth", { id: "manager-1", agencyId: "agency-1", email: "manager@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["employee-auth", { id: "employee-1", agencyId: "agency-1", email: "employee@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["client-auth", { id: "client-user", agencyId: "agency-1", clientId: "client-1", email: "client@test.dev", isActive: true, role: { name: roles.CLIENT }, assignments: [] }],
      ["other-auth", { id: "manager-9", agencyId: "agency-9", email: "other@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-9" }] }],
    ]);
  }
  async findUserByAuthToken(id) { return this.users.get(id) ?? null; }
}

class FakeAuthProvider {
  async verifySessionToken(token) { return { id: token }; }
}

function researchClient() {
  return {
    id: "client-1", agencyId: "agency-1", companyName: "Acme Tools", status: "active",
    websites: [{
      id: "website-1", domain: "acme.test", seoScore: 80, businessCategory: "software", targetLocations: ["US"],
      keywords: [{ keyword: "seo tools", intent: "commercial", targetPage: "/tools", searchVolume: 900, difficulty: 40, rankings: [{ rankPosition: 8, recordedAt: new Date() }] }],
      backlinks: [{ sourceUrl: "https://example.test/list", targetUrl: "https://acme.test/tools", domainAuthority: 55, anchorText: "SEO tools" }],
      audits: [{ runAt: new Date(), overallScore: 80, issues: [{ issueType: "title", severity: "high", affectedUrl: "/tools", description: "Missing title" }] }],
      competitors: [{ domain: "rival.test", priority: "high", keywords: [], pages: [], backlinks: [] }],
      pageMetrics: [{ recordedAt: new Date(), clicks: 20, impressions: 200 }],
    }],
    tasks: [{ title: "Fix titles", category: "technical", priority: "high", status: "todo", deadline: null }],
    reports: [], contentBriefs: [],
  };
}

class MemoryAiRepository {
  constructor() {
    this.clients = new Map([["client-1", researchClient()], ["client-9", { ...researchClient(), id: "client-9", agencyId: "agency-9", companyName: "Other Co" }]]);
    this.requests = [];
    this.activities = [];
  }
  hydrate(record) {
    const client = this.clients.get(record.clientId);
    return { ...record, client: client ? { id: client.id, agencyId: client.agencyId, companyName: client.companyName } : null, website: client?.websites.find((website) => website.id === record.websiteId) ?? null, user: { id: record.userId } };
  }
  async getResearchContext(clientId, websiteId) {
    const client = this.clients.get(clientId);
    if (!client) return null;
    return { ...client, websites: websiteId ? client.websites.filter((website) => website.id === websiteId) : client.websites };
  }
  async createRequest(data) { const record = { id: `ai-${this.requests.length + 1}`, createdAt: new Date(), outputText: null, ...data }; this.requests.push(record); return this.hydrate(record); }
  async updateRequest(id, data) { const record = this.requests.find((item) => item.id === id); Object.assign(record, data); return this.hydrate(record); }
  async findRequestById(id) { const record = this.requests.find((item) => item.id === id); return record ? this.hydrate(record) : null; }
  async listRequests(where) {
    return this.requests.filter((record) => {
      if (where.client?.agencyId && this.clients.get(record.clientId)?.agencyId !== where.client.agencyId) return false;
      if (where.clientId?.in && !where.clientId.in.includes(record.clientId)) return false;
      return typeof where.clientId !== "string" || record.clientId === where.clientId;
    }).map((record) => this.hydrate(record));
  }
  async createActivity(data) { this.activities.push(data); return data; }
}

class FakeAiProvider {
  name = "test";
  model = "test-model";
  calls = [];
  async generate(input) { this.calls.push(input); return { text: `Generated ${input.type}`, providerRequestId: "provider-1", usage: { input_tokens: 10, output_tokens: 5 } }; }
}

function makeApp({ repository = new MemoryAiRepository(), provider = new FakeAiProvider(), limiter } = {}) {
  return {
    app: createApp({ userRepository: new MemoryUserRepository(), sessionProvider: new FakeAuthProvider(), aiRepository: repository, aiProvider: provider, aiRateLimiter: limiter }),
    repository,
    provider,
  };
}

describe("AI research and governance", () => {
  it("supports all six evidence-bound workflows and stores their history", async () => {
    const setup = makeApp();
    for (const type of workflows) {
      const response = await request(setup.app).post("/api/v1/ai/generate").set("Authorization", "Bearer manager-auth").send({ type, clientId: "client-1", websiteId: "website-1", instructions: "Focus on growth" });
      expect(response.status).toBe(201);
      expect(response.body.request).toMatchObject({ requestType: type, status: "completed", reviewStatus: "pending", provider: "test" });
    }
    expect(setup.repository.requests).toHaveLength(6);
    expect(setup.provider.calls[0].prompt.instructions).toContain("untrusted data");
    expect(setup.provider.calls[0].prompt.input).toContain("seo tools");
  });

  it("keeps output internal, tenant scoped, and manager reviewed", async () => {
    const setup = makeApp();
    const generated = await request(setup.app).post("/api/v1/ai/generate").set("Authorization", "Bearer employee-auth").send({ type: "audit_summary", clientId: "client-1" });
    const id = generated.body.request.id;
    const client = await request(setup.app).get("/api/v1/ai/history").set("Authorization", "Bearer client-auth");
    const otherTenant = await request(setup.app).get(`/api/v1/ai/history/${id}`).set("Authorization", "Bearer other-auth");
    const employeeReview = await request(setup.app).patch(`/api/v1/ai/history/${id}/review`).set("Authorization", "Bearer employee-auth").send({ reviewStatus: "approved" });
    const managerReview = await request(setup.app).patch(`/api/v1/ai/history/${id}/review`).set("Authorization", "Bearer manager-auth").send({ reviewStatus: "approved" });

    expect(client.status).toBe(403);
    expect(otherTenant.status).toBe(404);
    expect(employeeReview.status).toBe(403);
    expect(managerReview.body.request).toMatchObject({ reviewStatus: "approved", reviewedBy: "manager-1" });
  });

  it("persists provider failures without exposing provider details", async () => {
    const repository = new MemoryAiRepository();
    const provider = { name: "broken", model: "broken-model", async generate() { throw new Error("secret upstream detail"); } };
    const setup = makeApp({ repository, provider });
    const response = await request(setup.app).post("/api/v1/ai/generate").set("Authorization", "Bearer manager-auth").send({ type: "report_summary", clientId: "client-1" });

    expect(response.status).toBe(502);
    expect(response.body.error).toBe("AI provider request failed");
    expect(repository.requests[0]).toMatchObject({ status: "failed", reviewStatus: "not_applicable", errorMessage: "secret upstream detail" });
  });

  it("rate limits generation per authenticated user", async () => {
    const limiter = new SlidingWindowRateLimiter({ max: 1, windowMs: 60000, now: () => 1000 });
    const { app } = makeApp({ limiter });
    const first = await request(app).post("/api/v1/ai/generate").set("Authorization", "Bearer manager-auth").send({ type: "content_brief", clientId: "client-1" });
    const second = await request(app).post("/api/v1/ai/generate").set("Authorization", "Bearer manager-auth").send({ type: "content_brief", clientId: "client-1" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.headers["retry-after"]).toBe("60");
  });
});

describe("API hardening", () => {
  it("adds security headers, hides Express, and rejects unknown origins", async () => {
    const { app } = makeApp();
    const normal = await request(app).get("/api/v1/health");
    const blocked = await request(app).get("/api/v1/health").set("Origin", "https://untrusted.example");
    expect(normal.headers["x-powered-by"]).toBeUndefined();
    expect(normal.headers["x-content-type-options"]).toBe("nosniff");
    expect(normal.headers["x-frame-options"]).toBe("DENY");
    expect(blocked.status).toBe(403);
  });
});
