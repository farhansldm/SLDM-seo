import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaKeywordRepository } from "../repositories/keywordRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { KeywordService } from "../services/keywordService.js";

const keywordSchema = z.object({
  keyword: z.string().min(1),
  groupId: z.string().nullable().optional(),
  searchVolume: z.coerce.number().int().nonnegative().nullable().optional(),
  difficulty: z.coerce.number().int().min(0).max(100).nullable().optional(),
  cpc: z.coerce.number().nonnegative().nullable().optional(),
  intent: z.string().nullable().optional(),
  device: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

const groupSchema = z.object({ name: z.string().min(1) });
const importSchema = z.object({ csv: z.string().optional(), keywords: z.array(keywordSchema).optional() });
const rankingsSchema = z.object({ days: z.coerce.number().refine((value) => value === 30 || value === 90).default(30) });

function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;
  return res.status(statusCode).json({ error: message });
}

export function createKeywordRouter({
  userRepository = new PrismaUserRepository(),
  keywordRepository = new PrismaKeywordRepository(),
  authProvider = new SupabaseAuthProvider(),
  keywordService,
} = {}) {
  const router = Router();
  const service = keywordService ?? new KeywordService(keywordRepository);

  router.use(authenticate(userRepository, authProvider));

  const canReadKeywords = requireAnyPermission("keyword:manage_all", "keyword:manage_assigned", "keyword:view_assigned");
  const canManageKeywords = requireAnyPermission("keyword:manage_all", "keyword:manage_assigned");

  router.get("/websites/:websiteId/keywords", canReadKeywords, async (req, res) => {
    try {
      const dashboard = await service.listDashboard(req.auth, req.params.websiteId, req.query);
      return res.json(dashboard);
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/websites/:websiteId/keyword-groups", canManageKeywords, async (req, res) => {
    try {
      const input = groupSchema.parse(req.body);
      const group = await service.createGroup(req.auth, req.params.websiteId, input.name);
      return res.status(201).json({ group });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  router.post("/websites/:websiteId/keywords", canManageKeywords, async (req, res) => {
    try {
      const input = keywordSchema.parse(req.body);
      const keyword = await service.createKeyword(req.auth, req.params.websiteId, input);
      return res.status(201).json({ keyword });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  router.patch("/keywords/:keywordId", canManageKeywords, async (req, res) => {
    try {
      const input = keywordSchema.partial().parse(req.body);
      const keyword = await service.updateKeyword(req.auth, req.params.keywordId, input);
      return res.json({ keyword });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  router.delete("/keywords/:keywordId", canManageKeywords, async (req, res) => {
    try {
      return res.json(await service.deleteKeyword(req.auth, req.params.keywordId));
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/websites/:websiteId/keywords/import", canManageKeywords, async (req, res) => {
    try {
      const input = importSchema.parse(req.body);
      return res.status(201).json(await service.importKeywords(req.auth, req.params.websiteId, input));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  router.get("/websites/:websiteId/keywords/export", canReadKeywords, async (req, res) => {
    try {
      const csv = await service.exportKeywords(req.auth, req.params.websiteId, req.query);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="keywords-${req.params.websiteId}.csv"`);
      return res.send(csv);
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/websites/:websiteId/keywords/generate-rankings", canManageKeywords, async (req, res) => {
    try {
      const input = rankingsSchema.parse(req.body ?? {});
      return res.json(await service.generateMockRankings(req.auth, req.params.websiteId, input.days));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
      return handleError(res, error);
    }
  });

  return router;
}
