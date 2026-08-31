import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { AuthService } from "../server/services/authService.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() {
    this.users = new Map();
    this.counter = 0;
  }

  async ensureRoles() {
    return undefined;
  }

  async findUserByEmail(email) {
    return [...this.users.values()].find((user) => user.email === email.toLowerCase()) ?? null;
  }

  async findUserById(id) {
    return this.users.get(id) ?? null;
  }

  async findUserBySupabaseAuthId(supabaseAuthId) {
    return [...this.users.values()].find((user) => user.supabaseAuthId === supabaseAuthId) ?? null;
  }

  async createAgencyAdmin({ agencyName, fullName, email, supabaseAuthId }) {
    this.counter += 1;
    const agencyId = `agency-${this.counter}`;
    const user = {
      id: `user-${this.counter}`,
      agencyId,
      clientId: null,
      email: email.toLowerCase(),
      fullName,
      supabaseAuthId,
      isActive: true,
      role: { name: roles.ADMIN },
      assignments: [],
    };
    this.users.set(user.id, user);
    return { id: agencyId, name: agencyName, users: [user] };
  }
}

class FakeSupabaseAuthProvider {
  constructor(usersByToken = {}) {
    this.usersByToken = usersByToken;
  }

  async verifyAccessToken(token) {
    const user = this.usersByToken[token];
    if (!user) {
      const error = new Error("Invalid or expired Supabase session");
      error.statusCode = 401;
      throw error;
    }
    return user;
  }
}

function makeApp() {
  const repo = new MemoryUserRepository();
  const authProvider = new FakeSupabaseAuthProvider({
    "valid-token": { id: "supabase-user-1", email: "admin@sldm.test" },
    "second-token": { id: "supabase-user-2", email: "admin@sldm.test" },
  });
  const authService = new AuthService(repo);
  return { app: createApp({ authService, userRepository: repo, authProvider }), repo };
}

describe("Supabase auth routes", () => {
  it("bootstraps an agency admin profile from a verified Supabase user", async () => {
    const { app } = makeApp();

    const response = await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer valid-token")
      .send({ agencyName: "SLDM SEO", fullName: "Admin User" });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: "admin@sldm.test",
      fullName: "Admin User",
      role: roles.ADMIN,
      assignedClientIds: [],
    });
    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
  });

  it("returns the existing app profile when bootstrap is repeated by the same Supabase user", async () => {
    const { app, repo } = makeApp();

    await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer valid-token")
      .send({ agencyName: "SLDM SEO", fullName: "Admin User" });
    const repeated = await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer valid-token")
      .send({ agencyName: "SLDM SEO", fullName: "Admin User" });

    expect(repeated.status).toBe(201);
    expect(repo.users.size).toBe(1);
  });

  it("rejects duplicate app-profile emails from different Supabase users", async () => {
    const { app } = makeApp();

    await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer valid-token")
      .send({ agencyName: "SLDM SEO", fullName: "Admin User" });
    const duplicate = await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer second-token")
      .send({ agencyName: "Other SEO", fullName: "Second User" });

    expect(duplicate.status).toBe(409);
  });

  it("protects the current-user endpoint with a verified Supabase bearer token", async () => {
    const { app } = makeApp();
    await request(app)
      .post("/api/v1/auth/bootstrap-agency")
      .set("Authorization", "Bearer valid-token")
      .send({ agencyName: "SLDM SEO", fullName: "Admin User" });

    const unauthorized = await request(app).get("/api/v1/auth/me");
    const invalid = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer invalid-token");
    const authorized = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer valid-token");

    expect(unauthorized.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(authorized.status).toBe(200);
    expect(authorized.body.user).toMatchObject({ email: "admin@sldm.test", role: roles.ADMIN });
  });
});
