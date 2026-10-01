import { env } from "../config/env.js";
import { MockAiProvider } from "./providers/mockAiProvider.js";
import { OpenAiProvider } from "./providers/openAiProvider.js";

export function createAiProvider(config = env) {
  if (config.AI_PROVIDER === "openai") {
    return new OpenAiProvider({
      apiKey: config.OPENAI_API_KEY,
      baseUrl: config.OPENAI_BASE_URL,
      model: config.OPENAI_MODEL,
      timeoutMs: config.AI_REQUEST_TIMEOUT_MS,
    });
  }
  return new MockAiProvider();
}
