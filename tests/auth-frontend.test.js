import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentUser, signIn, signOut, signUp } from "../src/features/auth/authApi.js";

afterEach(() => vi.unstubAllGlobals());

describe("cookie session frontend client", () => {
  it("uses credentials for signup, login, current session, and logout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: { id: "user-1" } }) });
    vi.stubGlobal("fetch", fetchMock);
    await signUp({ agencyName: "Agency", fullName: "Admin", email: "admin@test.dev", password: "Strong password 2026!" });
    await signIn({ email: "admin@test.dev", password: "Strong password 2026!" });
    await getCurrentUser();
    await signOut();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    fetchMock.mock.calls.forEach(([, options]) => expect(options.credentials).toBe("include"));
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(fetchMock.mock.calls[3][1].method).toBe("POST");
  });
});
