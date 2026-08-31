import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { AuthService } from "../services/authService.js";

const bootstrapSchema = z.object({
  agencyName: z.string().min(2),
  fullName: z.string().min(2),
});

function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;
  return res.status(statusCode).json({ error: message });
}

function readBearerToken(req) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : null;
}

export function createAuthRouter({
  authService,
  userRepository = new PrismaUserRepository(),
  authProvider = new SupabaseAuthProvider(),
} = {}) {
  const router = Router();
  const service = authService ?? new AuthService(userRepository);

  router.post("/bootstrap-agency", async (req, res) => {
    try {
      const token = readBearerToken(req);
      if (!token) return res.status(401).json({ error: "Missing bearer token" });
      const input = bootstrapSchema.parse(req.body);
      const supabaseUser = await authProvider.verifyAccessToken(token);
      return res.status(201).json(await service.bootstrapAgencyAdmin(supabaseUser, input));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  router.get("/me", authenticate(userRepository, authProvider), (req, res) => {
    return res.json({ user: req.auth });
  });

  return router;
}
