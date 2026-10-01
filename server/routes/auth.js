import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/authenticate.js";
import { SlidingWindowRateLimiter } from "../middleware/rateLimit.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { AuthService } from "../services/authService.js";

const bootstrapSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(2).max(120),
});

function handleError(res, error) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createAuthRouter({
  authService,
  userRepository = new PrismaUserRepository(),
  authProvider = new SupabaseAuthProvider(),
  authRateLimiter = new SlidingWindowRateLimiter({ max: env.AUTH_RATE_LIMIT_MAX, windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS }),
} = {}) {
  const router = Router();
  const service = authService ?? new AuthService(userRepository);

  router.post("/bootstrap-agency", authRateLimiter.middleware(), async (req, res) => {
    try {
      const [scheme, token] = (req.get("authorization") ?? "").split(" ");
      if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Missing bearer token" });
      const input = bootstrapSchema.parse(req.body);
      const supabaseUser = await authProvider.verifyAccessToken(token);
      return res.status(201).json(await service.bootstrapAgencyAdmin(supabaseUser, input));
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get("/me", authenticate(userRepository, authProvider), (req, res) => res.json({ user: req.auth }));
  return router;
}
