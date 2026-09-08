import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaTaskRepository } from "../repositories/taskRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { TaskService } from "../services/taskService.js";

const statuses = ["todo", "in_progress", "blocked", "done", "cancelled"];
const priorities = ["low", "medium", "high", "urgent"];
const nullableId = z.string().min(1).nullable().optional();
const taskSchema = z.object({
  clientId: z.string().min(1),
  websiteId: nullableId,
  assignedTo: nullableId,
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().max(80).nullable().optional(),
  priority: z.enum(priorities).default("medium"),
  status: z.enum(statuses).default("todo"),
  deadline: z.coerce.date().nullable().optional(),
});
const taskUpdateSchema = z.object({
  clientId: z.string().min(1).optional(),
  websiteId: nullableId,
  assignedTo: nullableId,
  title: z.string().trim().min(2).max(200).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  priority: z.enum(priorities).optional(),
  status: z.enum(statuses).optional(),
  deadline: z.coerce.date().nullable().optional(),
});
const filtersSchema = z.object({ clientId: z.string().optional(), websiteId: z.string().optional(), assignedTo: z.string().optional(), status: z.enum(statuses).optional() });
const commentSchema = z.object({ comment: z.string().trim().min(1).max(5000) });
const attachmentSchema = z.object({ fileUrl: z.string().url().max(2000) });

function validationError(res, error) {
  if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues });
  return null;
}

function handleError(res, error) {
  const validation = validationError(res, error);
  if (validation) return validation;
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createTaskRouter({
  userRepository = new PrismaUserRepository(),
  taskRepository = new PrismaTaskRepository(),
  authProvider = new SupabaseAuthProvider(),
  taskService,
} = {}) {
  const router = Router();
  const service = taskService ?? new TaskService(taskRepository);
  const canUseTasks = requireAnyPermission("task:manage_all", "task:assign_assigned", "task:update_assigned");
  const canManageTasks = requireAnyPermission("task:manage_all", "task:assign_assigned");

  router.use(authenticate(userRepository, authProvider));

  router.get("/tasks/my", canUseTasks, async (req, res) => {
    try { return res.json(await service.listMyTasks(req.auth, filtersSchema.parse(req.query))); } catch (error) { return handleError(res, error); }
  });

  router.get("/tasks/workload", canManageTasks, async (req, res) => {
    try { return res.json(await service.getWorkload(req.auth)); } catch (error) { return handleError(res, error); }
  });

  router.get("/tasks", canUseTasks, async (req, res) => {
    try { return res.json(await service.listTasks(req.auth, filtersSchema.parse(req.query))); } catch (error) { return handleError(res, error); }
  });

  router.post("/tasks", canManageTasks, async (req, res) => {
    try { return res.status(201).json(await service.createTask(req.auth, taskSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });

  router.get("/tasks/:taskId", canUseTasks, async (req, res) => {
    try { return res.json(await service.getTask(req.auth, req.params.taskId)); } catch (error) { return handleError(res, error); }
  });

  router.patch("/tasks/:taskId", canUseTasks, async (req, res) => {
    try { return res.json(await service.updateTask(req.auth, req.params.taskId, taskUpdateSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });

  router.delete("/tasks/:taskId", canManageTasks, async (req, res) => {
    try { return res.json(await service.deleteTask(req.auth, req.params.taskId)); } catch (error) { return handleError(res, error); }
  });

  router.post("/tasks/:taskId/comments", canUseTasks, async (req, res) => {
    try { return res.status(201).json(await service.addComment(req.auth, req.params.taskId, commentSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });

  router.post("/tasks/:taskId/attachments", canUseTasks, async (req, res) => {
    try { return res.status(201).json(await service.addAttachment(req.auth, req.params.taskId, attachmentSchema.parse(req.body))); } catch (error) { return handleError(res, error); }
  });

  router.get("/notifications", canUseTasks, async (req, res) => {
    try { return res.json(await service.listNotifications(req.auth)); } catch (error) { return handleError(res, error); }
  });

  router.patch("/notifications/:notificationId/read", canUseTasks, async (req, res) => {
    try { return res.json(await service.markNotificationRead(req.auth, req.params.notificationId)); } catch (error) { return handleError(res, error); }
  });

  router.get("/alerts", canManageTasks, async (req, res) => {
    try { return res.json(await service.listAlerts(req.auth, z.object({ status: z.enum(["open", "resolved"]).optional() }).parse(req.query))); } catch (error) { return handleError(res, error); }
  });

  router.patch("/alerts/:alertId/resolve", canManageTasks, async (req, res) => {
    try { return res.json(await service.resolveAlert(req.auth, req.params.alertId)); } catch (error) { return handleError(res, error); }
  });

  return router;
}
