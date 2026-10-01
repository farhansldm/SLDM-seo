import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { SlidingWindowRateLimiter } from "../server/middleware/rateLimit.js";
import { AuthService } from "../server/services/authService.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() { this.users = new Map(); this.counter = 0; }
  async ensureRoles() {}
  async findUserByEmail(email) { return [...this.users.values()].find((user) => user.email === email.toLowerCase()) ?? null; }
  async findUserById(id) { return this.users.get(id) ?? null; }
  async createAgencyAdmin({ agencyName, fullName, email, passwordHash }) {
    this.counter += 1;
    const user = {
      id: `user-${this.counter}`, agencyId: `agency-${this.counter}`, clientId: null, email: email.toLowerCase(), fullName,
      isActive: true, role: { name: roles.ADMIN }, assignments: [],
      credential: { passwordHash, failedAttempts: 0, lockedUntil: null },
    };
    this.users.set(user.id, user);
    return { id: user.agencyId, name: agencyName, users: [user] };
  }
  async updateCredential(userId, data) { Object.assign(this.users.get(userId).credential, data); return this.users.get(userId).credential; }
}

class MemorySessionProvider {
  constructor(repository) { this.repository = repository; this.sessions = new Map(); this.counter = 0; }
  async createSession(userId) {
    const token = `opaque-session-${++this.counter}`;
    const expiresAt = new Date(Date.now() + 3600000);
    this.sessions.set(token, userId);
    return { token, expiresAt };
  }
  async verifySessionToken(token) {
    const user = await this.repository.findUserById(this.sessions.get(token));
    if (!user) { const error = new Error("Invalid or expired session"); error.statusCode = 401; throw error; }
    return { user, session: { id: token } };
  }
  async revokeSession(token) { this.sessions.delete(token); }
}

function makeApp() {
  const repository = new MemoryUserRepository();
  const sessionProvider = new MemorySessionProvider(repository);
  const authService = new AuthService(repository, sessionProvider);
  const authRateLimiter = new SlidingWindowRateLimiter({ max: 100, windowMs: 60000 });
  return { app: createApp({ authService, userRepository: repository, sessionProvider, authRateLimiter }), repository, sessionProvider };
}

const signup = { agencyName: "SLDM SEO", fullName: "Admin User", email: "admin@sldm.test", password: "Strong password 2026!" };

describe("PostgreSQL session authentication routes", () => {
  it("creates an agency admin and returns only a secure opaque cookie", async () => {
    const setup = makeApp();
    const response = await request(setup.app).post("/api/v1/auth/signup").send(signup);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: signup.email, role: roles.ADMIN, assignedClientIds: [] });
    expect(response.body).not.toHaveProperty("token");
    expect(response.headers["set-cookie"][0]).toContain("seo_session=opaque-session-1");
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"][0]).toContain("SameSite=Strict");
    expect(setup.repository.users.get("user-1").credential.passwordHash).not.toContain(signup.password);
  });

  it("restores the session from a cookie and revokes it on logout", async () => {
    const { app } = makeApp();
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/signup").send(signup);
    const current = await agent.get("/api/v1/auth/me");
    const logout = await agent.post("/api/v1/auth/logout");
    const expired = await agent.get("/api/v1/auth/me");

    expect(current.status).toBe(200);
    expect(current.body.user.email).toBe(signup.email);
    expect(logout.status).toBe(204);
    expect(expired.status).toBe(401);
  });

  it("logs in with PostgreSQL credentials and rejects duplicate signup", async () => {
    const { app } = makeApp();
    await request(app).post("/api/v1/auth/signup").send(signup);
    const login = await request(app).post("/api/v1/auth/login").send({ email: "ADMIN@SLDM.TEST", password: signup.password });
    const duplicate = await request(app).post("/api/v1/auth/signup").send(signup);

    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe(roles.ADMIN);
    expect(duplicate.status).toBe(409);
  });

  it("uses generic login errors and locks repeated failures", async () => {
    const { app } = makeApp();
    await request(app).post("/api/v1/auth/signup").send(signup);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request(app).post("/api/v1/auth/login").send({ email: signup.email, password: "wrong password" });
      expect(failed.status).toBe(401);
      expect(failed.body.error).toBe("Invalid email or password");
    }
    const locked = await request(app).post("/api/v1/auth/login").send({ email: signup.email, password: signup.password });
    expect(locked.status).toBe(423);
  });

  it("validates strong signup passwords and protects the current-user endpoint", async () => {
    const { app } = makeApp();
    const weak = await request(app).post("/api/v1/auth/signup").send({ ...signup, password: "short" });
    const unauthenticated = await request(app).get("/api/v1/auth/me");
    expect(weak.status).toBe(422);
    expect(unauthenticated.status).toBe(401);
  });
});
