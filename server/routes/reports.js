import { Router } from "express";
import path from "node:path";
import { z } from "zod";

import { DatabaseSessionProvider } from "../auth/session.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaReportRepository } from "../repositories/reportRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { ReportPdfService } from "../services/reportPdfService.js";
import { ReportService } from "../services/reportService.js";

const createSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(2).max(200).optional(),
  summary: z.string().trim().min(2).max(5000).optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).superRefine((value, context) => {
  if (value.periodEnd < value.periodStart) context.addIssue({ code: "custom", message: "periodEnd must be after periodStart", path: ["periodEnd"] });
  if (value.periodEnd - value.periodStart > 366 * 86400000) context.addIssue({ code: "custom", message: "Report period cannot exceed 366 days", path: ["periodEnd"] });
});

function handleError(res, error) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createReportRouter({
  userRepository = new PrismaUserRepository(),
  reportRepository = new PrismaReportRepository(),
  sessionProvider = new DatabaseSessionProvider(userRepository),
  reportPdfService = new ReportPdfService(),
  reportService,
} = {}) {
  const router = Router();
  const service = reportService ?? new ReportService(reportRepository, reportPdfService);
  const canReadReports = requireAnyPermission("report:approve_all", "report:approve_assigned", "report:view_approved");
  const canManageReports = requireAnyPermission("report:approve_all", "report:approve_assigned");

  router.use(authenticate(userRepository, sessionProvider));

  router.get("/reports", canReadReports, async (req, res) => {
    try { return res.json(await service.listReports(req.auth)); } catch (error) { return handleError(res, error); }
  });

  router.post("/reports", canManageReports, async (req, res) => {
    try { return res.status(201).json(await service.createReport(req.auth, createSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });

  router.get("/reports/:reportId", canReadReports, async (req, res) => {
    try { return res.json(await service.getReport(req.auth, req.params.reportId)); } catch (error) { return handleError(res, error); }
  });

  router.post("/reports/:reportId/pdf", canManageReports, async (req, res) => {
    try { return res.json(await service.generatePdf(req.auth, req.params.reportId)); } catch (error) { return handleError(res, error); }
  });

  router.patch("/reports/:reportId/approve", canManageReports, async (req, res) => {
    try { return res.json(await service.approveReport(req.auth, req.params.reportId)); } catch (error) { return handleError(res, error); }
  });

  router.get("/reports/:reportId/download", canReadReports, async (req, res) => {
    try {
      const download = await service.getDownload(req.auth, req.params.reportId);
      return res.download(path.resolve(download.filePath), download.fileName);
    } catch (error) { return handleError(res, error); }
  });

  router.get("/portal/dashboard", requireAnyPermission("report:view_approved"), async (req, res) => {
    try { return res.json(await service.getPortalDashboard(req.auth)); } catch (error) { return handleError(res, error); }
  });

  return router;
}
