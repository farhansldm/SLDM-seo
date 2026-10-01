import { Router } from "express";
import { z } from "zod";

import { clearSessionCookie, DatabaseSessionProvider, readSessionToken, setSessionCookie } from "../auth/session.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/authenticate.js";
import { SlidingWindowRateLimiter } from "../middleware/rateLimit.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { AuthService } from "../services/authService.js";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(12).max(128);
const signupSchema = z.object({ agencyName: z.string().trim().min(2).max(120), fullName: z.string().trim().min(2).max(120), email, password });
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

function metadata(req) {
  return { ipAddress: req.ip, userAgent: req.get("user-agent") };
}

function handleError(res, error) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createAuthRouter({
  authService,
  userRepository = new PrismaUserRepository(),
  sessionProvider = new DatabaseSessionProvider(userRepository),
  authRateLimiter = new SlidingWindowRateLimiter({ max: env.AUTH_RATE_LIMIT_MAX, windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS }),
} = {}) {
  const router = Router();
  const service = authService ?? new AuthService(userRepository, sessionProvider);
  const limitAuth = authRateLimiter.middleware();

  router.post("/signup", limitAuth, async (req, res) => {
    try {
      const result = await service.signup(signupSchema.parse(req.body), metadata(req));
      setSessionCookie(res, result.token, result.expiresAt);
      return res.status(201).json({ user: result.user });
    } catch (error) { return handleError(res, error); }
  });

  router.post("/login", limitAuth, async (req, res) => {
    try {
      const result = await service.login(loginSchema.parse(req.body), metadata(req));
      setSessionCookie(res, result.token, result.expiresAt);
      return res.json({ user: result.user });
    } catch (error) { return handleError(res, error); }
  });

  router.post("/logout", async (req, res) => {
    await service.logout(readSessionToken(req));
    clearSessionCookie(res);
    return res.status(204).end();
  });

  router.get("/me", authenticate(userRepository, sessionProvider), (req, res) => res.json({ user: req.auth }));
  return router;
}
