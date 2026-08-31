import { describe, expect, it } from "vitest";

import { requirePermission } from "../server/middleware/requirePermission.js";
import { roles } from "../shared/permissions.js";
import { canAccessClient, scopeRecordsByClient, scopedClientWhere } from "../shared/tenantScope.js";

function runGuard(role, permission) {
  const req = { auth: role ? { role } : null };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  requirePermission(permission)(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, res };
}

describe("route permission guard", () => {
  it("allows roles with the required permission", () => {
    expect(runGuard(roles.ADMIN, "team:manage").nextCalled).toBe(true);
    expect(runGuard(roles.MANAGER, "report:approve_assigned").nextCalled).toBe(true);
  });

  it("blocks missing or underprivileged roles", () => {
    expect(runGuard(null, "team:manage").res.statusCode).toBe(403);
    expect(runGuard(roles.CLIENT, "ai:use_internal").res.statusCode).toBe(403);
  });
});

describe("tenant isolation", () => {
  const records = [
    { id: "record-1", agencyId: "agency-1", clientId: "client-1" },
    { id: "record-2", agencyId: "agency-1", clientId: "client-2" },
    { id: "record-3", agencyId: "agency-2", clientId: "client-3" },
  ];

  it("allows admin users only inside their agency", () => {
    const user = { role: roles.ADMIN, agencyId: "agency-1" };

    expect(canAccessClient(user, "any-client")).toBe(true);
    expect(scopeRecordsByClient(records, user).map((record) => record.id)).toEqual(["record-1", "record-2"]);
    expect(scopedClientWhere(user)).toEqual({ agencyId: "agency-1" });
  });

  it("limits managers and employees to assigned clients", () => {
    const manager = { role: roles.MANAGER, agencyId: "agency-1", assignedClientIds: ["client-1"] };
    const employee = { role: roles.EMPLOYEE, agencyId: "agency-1", assignedClientIds: ["client-2"] };

    expect(canAccessClient(manager, "client-1")).toBe(true);
    expect(canAccessClient(manager, "client-2")).toBe(false);
    expect(scopeRecordsByClient(records, manager).map((record) => record.id)).toEqual(["record-1"]);
    expect(scopeRecordsByClient(records, employee).map((record) => record.id)).toEqual(["record-2"]);
  });

  it("limits client users to their own client account", () => {
    const user = { role: roles.CLIENT, agencyId: "agency-1", clientId: "client-2" };

    expect(canAccessClient(user, "client-2")).toBe(true);
    expect(canAccessClient(user, "client-1")).toBe(false);
    expect(scopedClientWhere(user)).toEqual({ id: { in: ["client-2"] } });
  });
});
