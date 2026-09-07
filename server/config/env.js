import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/seo_agency"),
  SUPABASE_URL: z.string().url().default("https://example.supabase.co"),
  SUPABASE_ANON_KEY: z.string().min(1).default("test-anon-key"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JOB_MODE: z.enum(["inline", "redis"]).default("inline"),
  DATA_MODE: z.enum(["mock", "live"]).default("mock"),
});

export const env = envSchema.parse(process.env);
