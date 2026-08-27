import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { roles, hasPermission } from "../shared/permissions.js";
import { toClientSafeRecord } from "../shared/clientSafeData.js";
import { canAccessClient, getAllowedClientIds } from "../shared/tenantScope.js";

it("health endpoint responds", async () => {
  const app = createApp();
  const response = await request(app).get("/api/v1/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

describe("permissions", () => {
  it("allows admin agency management", () => {
    expect(hasPermission(roles.ADMIN, "agency:manage")).toBe(true);
  });

  it("does not allow client internal AI usage", () => {
    expect(hasPermission(roles.CLIENT, "ai:use_internal")).toBe(false);
  });
});

describe("client-safe serializer", () => {
  it("removes restricted fields for client role", () => {
    const result = toClientSafeRecord({ companyName: "A", retainerAmount: 1000, passwordHash: "x" }, roles.CLIENT);
    expect(result).toEqual({ companyName: "A" });
  });
});

describe("tenant scoping", () => {
  it("limits client role to own client id", () => {
    const user = { role: roles.CLIENT, clientId: "client-1" };
    expect(getAllowedClientIds(user)).toEqual(["client-1"]);
    expect(canAccessClient(user, "client-2")).toBe(false);
  });

  it("allows admin agency-wide access", () => {
    const user = { role: roles.ADMIN, agencyId: "agency-1" };
    expect(getAllowedClientIds(user)).toBeNull();
  });
});