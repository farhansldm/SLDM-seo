import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["admin-auth", { id: "user-1", agencyId: "agency-1", email: "admin@sldm.test", fullName: "Admin", isActive: true, role: { name: roles.ADMIN }, assignments: [] }],
      ["manager-auth", { id: "user-2", agencyId: "agency-1", email: "manager@sldm.test", fullName: "Manager", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["employee-auth", { id: "user-3", agencyId: "agency-1", email: "employee@sldm.test", fullName: "Employee", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["client-auth", { id: "user-4", agencyId: "agency-1", email: "client@sldm.test", fullName: "Client", isActive: true, role: { name: roles.CLIENT }, clientId: "client-1", assignments: [] }],
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

class MemoryKeywordRepository {
  constructor() {
    this.websites = new Map([
      ["website-1", { id: "website-1", clientId: "client-1", domain: "example.com", client: { id: "client-1", agencyId: "agency-1" } }],
      ["website-2", { id: "website-2", clientId: "client-2", domain: "other.com", client: { id: "client-2", agencyId: "agency-1" } }],
      ["website-3", { id: "website-3", clientId: "client-3", domain: "blocked.com", client: { id: "client-3", agencyId: "agency-2" } }],
    ]);
    this.groups = [];
    this.keywords = [];
    this.rankings = [];
  }

  async findWebsiteById(websiteId) {
    return this.websites.get(websiteId) ?? null;
  }

  async findKeywordById(keywordId) {
    const keyword = this.keywords.find((item) => item.id === keywordId);
    if (!keyword) return null;
    return { ...keyword, website: await this.findWebsiteById(keyword.websiteId) };
  }

  async listGroups(websiteId) {
    return this.groups.filter((group) => group.websiteId === websiteId);
  }

  async createGroup(websiteId, name) {
    const group = { id: `group-${this.groups.length + 1}`, websiteId, name };
    this.groups.push(group);
    return group;
  }

  async listKeywords(websiteId, filters = {}) {
    return this.keywords
      .filter((keyword) => keyword.websiteId === websiteId)
      .filter((keyword) => !filters.intent || keyword.intent === filters.intent)
      .filter((keyword) => !filters.device || keyword.device === filters.device)
      .filter((keyword) => !filters.q || keyword.keyword.includes(filters.q))
      .map((keyword) => ({
        ...keyword,
        group: this.groups.find((group) => group.id === keyword.groupId) ?? null,
        rankings: this.rankings.filter((ranking) => ranking.keywordId === keyword.id).sort((a, b) => a.recordedAt - b.recordedAt),
      }));
  }

  async createKeyword(websiteId, input) {
    const keyword = { id: `keyword-${this.keywords.length + 1}`, websiteId, rankings: [], group: null, ...input };
    this.keywords.push(keyword);
    return keyword;
  }

  async updateKeyword(keywordId, input) {
    const index = this.keywords.findIndex((keyword) => keyword.id === keywordId);
    this.keywords[index] = { ...this.keywords[index], ...input };
    return this.keywords[index];
  }

  async deleteKeyword(keywordId) {
    this.keywords = this.keywords.filter((keyword) => keyword.id !== keywordId);
    this.rankings = this.rankings.filter((ranking) => ranking.keywordId !== keywordId);
    return { id: keywordId };
  }

  async replaceRankings(keywordId, rankings) {
    this.rankings = this.rankings.filter((ranking) => ranking.keywordId !== keywordId);
    const next = rankings.map((ranking, index) => ({ id: `${keywordId}-ranking-${index}`, keywordId, ...ranking }));
    this.rankings.push(...next);
    return next;
  }
}

function makeApp() {
  return createApp({
    userRepository: new MemoryUserRepository(),
    authProvider: new FakeSupabaseAuthProvider(),
    keywordRepository: new MemoryKeywordRepository(),
  });
}

describe("keyword intelligence routes", () => {
  it("creates keywords and returns movement summaries", async () => {
    const app = makeApp();

    const created = await request(app)
      .post("/api/v1/websites/website-1/keywords")
      .set("Authorization", "Bearer manager-auth")
      .send({ keyword: "seo agency", searchVolume: 1200, difficulty: 42, cpc: 3.2, intent: "commercial", device: "desktop", location: "United States", language: "en" });
    const generated = await request(app)
      .post("/api/v1/websites/website-1/keywords/generate-rankings")
      .set("Authorization", "Bearer manager-auth")
      .send({ days: 30 });

    expect(created.status).toBe(201);
    expect(created.body.keyword).toMatchObject({ keyword: "seo agency", intent: "commercial", device: "desktop" });
    expect(generated.status).toBe(200);
    expect(generated.body.keywords[0].rankings).toHaveLength(30);
    expect(generated.body.summary).toMatchObject({ total: 1, top100: 1 });
  });

  it("imports and exports keyword CSV", async () => {
    const app = makeApp();

    const imported = await request(app)
      .post("/api/v1/websites/website-1/keywords/import")
      .set("Authorization", "Bearer admin-auth")
      .send({ csv: "keyword,searchVolume,difficulty,cpc,intent,device,location,language\nrank tracker,900,35,2.5,informational,mobile,India,en" });
    const exported = await request(app)
      .get("/api/v1/websites/website-1/keywords/export")
      .set("Authorization", "Bearer admin-auth");

    expect(imported.status).toBe(201);
    expect(imported.body.imported).toBe(1);
    expect(exported.status).toBe(200);
    expect(exported.text).toContain("rank tracker");
    expect(exported.text).toContain("searchVolume");
  });

  it("allows employees to read assigned keyword data but blocks mutation", async () => {
    const app = makeApp();

    const read = await request(app).get("/api/v1/websites/website-1/keywords").set("Authorization", "Bearer employee-auth");
    const mutate = await request(app)
      .post("/api/v1/websites/website-1/keywords")
      .set("Authorization", "Bearer employee-auth")
      .send({ keyword: "blocked mutation" });

    expect(read.status).toBe(200);
    expect(mutate.status).toBe(403);
  });

  it("blocks client role and cross-tenant website access", async () => {
    const app = makeApp();

    const clientRead = await request(app).get("/api/v1/websites/website-1/keywords").set("Authorization", "Bearer client-auth");
    const crossTenant = await request(app).get("/api/v1/websites/website-3/keywords").set("Authorization", "Bearer admin-auth");
    const unassigned = await request(app).get("/api/v1/websites/website-2/keywords").set("Authorization", "Bearer manager-auth");

    expect(clientRead.status).toBe(403);
    expect(crossTenant.status).toBe(404);
    expect(unassigned.status).toBe(404);
  });
});
