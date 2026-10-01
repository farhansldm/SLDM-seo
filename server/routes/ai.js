import { Router } from "express";
import { z } from "zod";

import { AI_WORKFLOWS } from "../ai/prompts.js";
import { createAiProvider } from "../ai/providerFactory.js";
import { DatabaseSessionProvider } from "../auth/session.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/authenticate.js";
import { SlidingWindowRateLimiter } from "../middleware/rateLimit.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaAiRepository } from "../repositories/aiRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { AiService } from "../services/aiService.js";

const generateSchema = z.object({
  type: z.enum(Object.keys(AI_WORKFLOWS)),
  clientId: z.string().min(1),
  websiteId: z.string().min(1).optional(),
  instructions: z.string().trim().max(4000).default(""),
});
const listSchema = z.object({ clientId: z.string().min(1).optional() });
const reviewSchema = z.object({ reviewStatus: z.enum(["approved", "rejected"]) });

function handleError(res, error) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createAiRouter({
  userRepository = new PrismaUserRepository(),
  aiRepository = new PrismaAiRepository(),
  sessionProvider = new DatabaseSessionProvider(userRepository),
  aiProvider = createAiProvider(),
  aiService,
  aiRateLimiter = new SlidingWindowRateLimiter({ max: env.AI_RATE_LIMIT_MAX, windowMs: env.AI_RATE_LIMIT_WINDOW_MS }),
} = {}) {
  const router = Router();
  const service = aiService ?? new AiService(aiRepository, aiProvider);
  const canUseAi = requireAnyPermission("ai:use_internal");

  router.use(authenticate(userRepository, sessionProvider));
  router.use(canUseAi);

  router.get("/ai/workflows", (_req, res) => res.json({ workflows: Object.entries(AI_WORKFLOWS).map(([type, workflow]) => ({ type, label: workflow.label })) }));
  router.get("/ai/history", async (req, res) => {
    try { return res.json(await service.list(req.auth, listSchema.parse(req.query).clientId)); } catch (error) { return handleError(res, error); }
  });
  router.get("/ai/history/:requestId", async (req, res) => {
    try { return res.json(await service.get(req.auth, req.params.requestId)); } catch (error) { return handleError(res, error); }
  });
  router.post("/ai/generate", aiRateLimiter.middleware(), async (req, res) => {
    try { return res.status(201).json(await service.generate(req.auth, generateSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });
  router.patch("/ai/history/:requestId/review", async (req, res) => {
    try { return res.json(await service.review(req.auth, req.params.requestId, reviewSchema.parse(req.body).reviewStatus)); } catch (error) { return handleError(res, error); }
  });

  return router;
}
