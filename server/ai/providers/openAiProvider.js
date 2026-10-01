export class OpenAiProvider {
  name = "openai";

  constructor({ apiKey, baseUrl, model, timeoutMs, fetchImpl = fetch }) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async generate({ prompt }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          instructions: prompt.instructions,
          input: prompt.input,
          reasoning: { effort: "low" },
          max_output_tokens: 1800,
          store: false,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI request failed with status ${response.status}`);
      const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!text) throw new Error("OpenAI response did not contain text output");
      return { text, providerRequestId: payload.id ?? null, usage: payload.usage ?? null };
    } catch (error) {
      if (error.name === "AbortError") throw new Error("OpenAI request timed out");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
