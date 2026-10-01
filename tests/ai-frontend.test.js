import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/auth/supabaseClient.js", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "supabase-token" } }, error: null }) } },
}));

import { generateAiResearch, reviewAiResearch } from "../src/features/ai/aiApi.js";

afterEach(() => vi.unstubAllGlobals());

describe("AI workspace API client", () => {
  it("sends authenticated generation and review requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ request: { id: "ai-1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ request: { id: "ai-1", reviewStatus: "approved" } }) });
    vi.stubGlobal("fetch", fetchMock);

    await generateAiResearch({ type: "content_brief", clientId: "client-1" });
    await reviewAiResearch("ai-1", "approved");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer supabase-token");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type: "content_brief", clientId: "client-1" });
    expect(fetchMock.mock.calls[1][0]).toContain("/ai/history/ai-1/review");
  });
});
