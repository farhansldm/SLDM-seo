import { Router } from "express";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { PrismaSeoDashboardRepository } from "../repositories/seoDashboardRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { SeoDashboardService } from "../services/seoDashboardService.js";

function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;
  return res.status(statusCode).json({ error: message });
}

export function createSeoDashboardRouter({
  userRepository = new PrismaUserRepository(),
  seoDashboardRepository = new PrismaSeoDashboardRepository(),
  authProvider = new SupabaseAuthProvider(),
  seoDashboardService,
} = {}) {
  const router = Router();
  const service = seoDashboardService ?? new SeoDashboardService(seoDashboardRepository);

  router.use(authenticate(userRepository, authProvider));

  router.get("/websites/:websiteId/seo-dashboard", async (req, res) => {
    try {
      return res.json(await service.getWebsiteDashboard(req.auth, req.params.websiteId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  return router;
}
