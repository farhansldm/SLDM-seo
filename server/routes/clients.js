import { Router } from "express";
import { z } from "zod";

import { SupabaseAuthProvider } from "../auth/supabase.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireAnyPermission } from "../middleware/requirePermission.js";
import { PrismaClientRepository } from "../repositories/clientRepository.js";
import { PrismaUserRepository } from "../repositories/userRepository.js";
import { ClientService } from "../services/clientService.js";

const clientSchema = z.object({
  companyName: z.string().min(2),
  status: z.string().default("active"),
  retainerAmount: z.coerce.number().nonnegative().nullable().optional(),
  retainerCycle: z.string().nullable().optional(),
});
const contactSchema = z.object({ name: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), roleTitle: z.string().optional(), isPrimary: z.boolean().optional() });
const noteSchema = z.object({ note: z.string().min(1) });
const assignSchema = z.object({ userId: z.string().min(1) });

function handleError(res, error) {
  const statusCode = error.statusCode ?? 500;
  return res.status(statusCode).json({ error: statusCode === 500 ? "Internal server error" : error.message });
}

export function createClientRouter({ userRepository = new PrismaUserRepository(), clientRepository = new PrismaClientRepository(), authProvider = new SupabaseAuthProvider(), clientService } = {}) {
  const router = Router();
  const service = clientService ?? new ClientService(clientRepository);
  const canReadClients = requireAnyPermission("client:manage_all", "client:manage_assigned", "client:view_assigned", "client:view_own_safe");
  const canManageClients = requireAnyPermission("client:manage_all", "client:manage_assigned");
  const canManageTeam = requireAnyPermission("team:manage", "client:manage_all", "client:manage_assigned");

  router.use(authenticate(userRepository, authProvider));

  router.get("/clients", canReadClients, async (req, res) => {
    try { return res.json(await service.listClients(req.auth)); } catch (error) { return handleError(res, error); }
  });

  router.post("/clients", canManageClients, async (req, res) => {
    try { return res.status(201).json(await service.createClient(req.auth, clientSchema.parse(req.body))); } catch (error) { if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues }); return handleError(res, error); }
  });

  router.get("/clients/:clientId", canReadClients, async (req, res) => {
    try { return res.json(await service.getClient(req.auth, req.params.clientId)); } catch (error) { return handleError(res, error); }
  });

  router.patch("/clients/:clientId", canManageClients, async (req, res) => {
    try { return res.json(await service.updateClient(req.auth, req.params.clientId, clientSchema.partial().parse(req.body))); } catch (error) { if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues }); return handleError(res, error); }
  });

  router.delete("/clients/:clientId", canManageClients, async (req, res) => {
    try { return res.json(await service.deleteClient(req.auth, req.params.clientId)); } catch (error) { return handleError(res, error); }
  });

  router.post("/clients/:clientId/contacts", canManageClients, async (req, res) => {
    try { return res.status(201).json(await service.addContact(req.auth, req.params.clientId, contactSchema.parse(req.body))); } catch (error) { if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues }); return handleError(res, error); }
  });

  router.post("/clients/:clientId/notes", canManageClients, async (req, res) => {
    try { return res.status(201).json(await service.addNote(req.auth, req.params.clientId, noteSchema.parse(req.body).note)); } catch (error) { if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues }); return handleError(res, error); }
  });

  router.post("/clients/:clientId/assignments", canManageTeam, async (req, res) => {
    try { return res.status(201).json(await service.assignUser(req.auth, req.params.clientId, assignSchema.parse(req.body).userId)); } catch (error) { if (error instanceof z.ZodError) return res.status(422).json({ error: "Invalid request", issues: error.issues }); return handleError(res, error); }
  });

  return router;
}
