import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/auth/supabaseClient.js", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "supabase-token" } }, error: null }) } },
}));

import { bootstrapAgencyAdmin, getCurrentUser } from "../src/features/auth/authApi.js";

afterEach(() => vi.unstubAllGlobals());

describe("Supabase frontend API client", () => {
  it("uses the current Supabase bearer token for bootstrap and profile requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: { id: "user-1" } }) });
    vi.stubGlobal("fetch", fetchMock);

    await bootstrapAgencyAdmin({ agencyName: "Agency", fullName: "Admin" });
    await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer supabase-token");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer supabase-token");
  });
});
