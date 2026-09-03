import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { PrismaWebsiteRepository } from "../repositories/websiteRepository.js";
import { WebsiteService } from "../services/websiteService.js";

const websiteSchema = z.object({
  domain: z.string().min(3), status: z.string().default("active"), seoScore: z.coerce.number().int().min(0).max(100).nullable().optional(), cms: z.string().nullable().optional(), businessCategory: z.string().nullable().optional(), targetLocations: z.array(z.string()).default([]), targetSearchEngines: z.array(z.string()).default(["google"]), preferredLocale: z.string().nullable().optional(), primaryCountry: z.string().nullable().optional(), isMock: z.boolean().default(true),
});
const competitorSchema = z.object({ domain: z.string().min(3), name: z.string().nullable().optional(), notes: z.string().nullable().optional(), priority: z.string().default("medium"), source: z.string().default("manual") });
function handleError(res, error){ const statusCode=error.statusCode ?? 500; return res.status(statusCode).json({ error: statusCode===500 ? "Internal server error" : error.message }); }

export function createWebsiteRouter({ userRepository = new PrismaUserRepository(), websiteRepository = new PrismaWebsiteRepository(), authProvider = new SupabaseAuthProvider(), websiteService } = {}) {
  const router = Router();
  const service = websiteService ?? new WebsiteService(websiteRepository);
  const canRead = requireAnyPermission("website:manage_all", "website:manage_assigned", "website:view_assigned", "website:view_own_safe");
  const canManage = requireAnyPermission("website:manage_all", "website:manage_assigned");
  router.use(authenticate(userRepository, authProvider));

  router.get("/clients/:clientId/websites", canRead, async (req,res)=>{ try{return res.json(await service.listWebsites(req.auth, req.params.clientId));}catch(error){return handleError(res,error);} });
  router.post("/clients/:clientId/websites", canManage, async (req,res)=>{ try{return res.status(201).json(await service.createWebsite(req.auth, req.params.clientId, websiteSchema.parse(req.body)));}catch(error){if(error instanceof z.ZodError)return res.status(422).json({error:"Invalid request",issues:error.issues});return handleError(res,error);} });
  router.patch("/websites/:websiteId", canManage, async (req,res)=>{ try{return res.json(await service.updateWebsite(req.auth, req.params.websiteId, websiteSchema.partial().parse(req.body)));}catch(error){if(error instanceof z.ZodError)return res.status(422).json({error:"Invalid request",issues:error.issues});return handleError(res,error);} });
  router.delete("/websites/:websiteId", canManage, async (req,res)=>{ try{return res.json(await service.deleteWebsite(req.auth, req.params.websiteId));}catch(error){return handleError(res,error);} });
  router.post("/websites/:websiteId/competitors", canManage, async (req,res)=>{ try{return res.status(201).json(await service.createCompetitor(req.auth, req.params.websiteId, competitorSchema.parse(req.body)));}catch(error){if(error instanceof z.ZodError)return res.status(422).json({error:"Invalid request",issues:error.issues});return handleError(res,error);} });
  router.patch("/competitors/:competitorId", canManage, async (req,res)=>{ try{return res.json(await service.updateCompetitor(req.auth, req.params.competitorId, competitorSchema.partial().parse(req.body)));}catch(error){if(error instanceof z.ZodError)return res.status(422).json({error:"Invalid request",issues:error.issues});return handleError(res,error);} });
  router.delete("/competitors/:competitorId", canManage, async (req,res)=>{ try{return res.json(await service.deleteCompetitor(req.auth, req.params.competitorId));}catch(error){return handleError(res,error);} });
  return router;
}
