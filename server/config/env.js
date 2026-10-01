import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/seo_agency"),
  SESSION_COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("seo_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JOB_MODE: z.enum(["inline", "redis"]).default("inline"),
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
  REPORT_STORAGE_DIR: z.string().default("storage/reports"),
  PUPPETEER_EXECUTABLE_PATH: z.preprocess((value) => value === "" ? undefined : value, z.string().optional()),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  JSON_BODY_LIMIT: z.string().default("1mb"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  OPENAI_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().min(1).default("gpt-6-astra"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
});

export const env = envSchema.parse(process.env);
