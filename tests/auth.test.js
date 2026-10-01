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

  async ensureRoles() {}
  async findUserByEmail(email) {
    return [...this.users.values()].find((user) => user.email === email.toLowerCase()) ?? null;
  }
  async findUserBySupabaseAuthId(id) {
    return [...this.users.values()].find((user) => user.supabaseAuthId === id) ?? null;
  }
  async linkSupabaseIdentity(id, supabaseAuthId) {
    const user = this.users.get(id);
    user.supabaseAuthId = supabaseAuthId;
    return user;
  }
  async createAgencyAdmin({ agencyName, fullName, email, supabaseAuthId }) {
    this.counter += 1;
    const user = {
      id: `user-${this.counter}`,
      agencyId: `agency-${this.counter}`,
      clientId: null,
      email: email.toLowerCase(),
      fullName,
      supabaseAuthId,
      isActive: true,
      role: { name: roles.ADMIN },
      assignments: [],
    };
    this.users.set(user.id, user);
    return { id: user.agencyId, name: agencyName, users: [user] };
  }
}

class FakeSupabaseAuthProvider {
  constructor() {
    this.users = {
      "valid-token": { id: "supabase-user-1", email: "admin@sldm.test" },
      "second-token": { id: "supabase-user-2", email: "admin@sldm.test" },
    };
  }
  async verifyAccessToken(token) {
    if (this.users[token]) return this.users[token];
    const error = new Error("Invalid or expired Supabase session");
    error.statusCode = 401;
    throw error;
  }
}

function setup() {
  const userRepository = new MemoryUserRepository();
  const authProvider = new FakeSupabaseAuthProvider();
  const authService = new AuthService(userRepository);
  return { app: createApp({ authService, userRepository, authProvider }), userRepository };
}

async function bootstrap(app, token = "valid-token") {
  return request(app)
    .post("/api/v1/auth/bootstrap-agency")
    .set("Authorization", `Bearer ${token}`)
    .send({ agencyName: "SLDM SEO", fullName: "Admin User" });
}

describe("Supabase auth", () => {
  it("bootstraps one tenant admin from a verified Supabase identity", async () => {
    const { app, userRepository } = setup();
    const first = await bootstrap(app);
    const repeated = await bootstrap(app);

    expect(first.status).toBe(201);
    expect(first.body.user).toMatchObject({ email: "admin@sldm.test", role: roles.ADMIN });
    expect(repeated.status).toBe(201);
    expect(userRepository.users.size).toBe(1);
  });

  it("rejects another Supabase identity claiming an existing profile email", async () => {
    const { app } = setup();
    await bootstrap(app);
    expect((await bootstrap(app, "second-token")).status).toBe(409);
  });

  it("requires a valid bearer token for the current profile", async () => {
    const { app } = setup();
    await bootstrap(app);

    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer invalid-token")).status).toBe(401);
    const profile = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer valid-token");
    expect(profile.status).toBe(200);
    expect(profile.body.user.email).toBe("admin@sldm.test");
  });
});
