import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Supabase Edge API Phase 1", () => {
  it("verifies bearer tokens and applies tenant scoping", () => {
    const auth = read("supabase/functions/api/_shared/auth.ts");
    const data = read("supabase/functions/api/_shared/data.ts");

    expect(auth).toContain("db.auth.getUser(token)");
    expect(auth).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(auth).toContain("assignedClientIds");
    expect(data).toContain("data.agencyId !== user.agencyId");
    expect(data).toContain("canAccessClient(user, clientId)");
  });

  it("covers the Phase 1 API resources", () => {
    const index = read("supabase/functions/api/index.ts");
    const auth = read("supabase/functions/api/auth.ts");
    const clients = read("supabase/functions/api/clients.ts");
    const websites = read("supabase/functions/api/websites.ts");

    expect(index).toContain('path === "/health"');
    expect(auth).toContain('path === "/auth/me"');
    expect(auth).toContain('path !== "/auth/bootstrap-agency"');
    expect(clients).toContain('path === "/team-members"');
    expect(clients).toContain("/(contacts|notes|assignments|websites)");
    expect(websites).toContain("/clients\\/([^/]+)\\/websites");
    expect(websites).toContain("/competitors\\/([^/]+)");
  });

  it("keeps JWT validation inside the function", () => {
    const config = read("supabase/config.toml");
    const handler = read("supabase/functions/api/index.ts");

    expect(config).toContain("verify_jwt = false");
    expect(handler).toContain("authRoutes");
    expect(handler).toContain("clientRoutes");
    expect(handler).toContain("websiteRoutes");
  });
});

