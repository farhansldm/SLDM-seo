import { Router } from "express";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaAuditRepository } from "../repositories/auditRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { TechnicalAuditService } from "../services/technicalAuditService.js";

function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;
  return res.status(statusCode).json({ error: message });
}

export function createAuditRouter({
  userRepository = new PrismaUserRepository(),
  auditRepository = new PrismaAuditRepository(),
  authProvider = new SupabaseAuthProvider(),
  technicalAuditService,
} = {}) {
  const router = Router();
  const service = technicalAuditService ?? new TechnicalAuditService(auditRepository);
  const canViewAudits = requireAnyPermission("audit:manage_all", "audit:manage_assigned", "audit:view_assigned");
  const canRunAudits = requireAnyPermission("audit:manage_all", "audit:manage_assigned");
  const canCreateTasks = requireAnyPermission("task:manage_all", "task:assign_assigned", "task:update_assigned");

  router.use(authenticate(userRepository, authProvider));

  router.get("/websites/:websiteId/audits", canViewAudits, async (req, res) => {
    try {
      return res.json(await service.listRuns(req.auth, req.params.websiteId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/websites/:websiteId/audits/run", canRunAudits, async (req, res) => {
    try {
      return res.status(201).json(await service.runAudit(req.auth, req.params.websiteId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get("/audits/:crawlRunId", canViewAudits, async (req, res) => {
    try {
      return res.json(await service.getRun(req.auth, req.params.crawlRunId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/technical-checks/:checkId/create-task", canCreateTasks, async (req, res) => {
    try {
      return res.status(201).json(await service.createTaskFromCheck(req.auth, req.params.checkId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  return router;
}
