import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { authenticate, clientsFor, requirePermission, type AppUser } from "./_shared/auth.ts";
import { activity, assertClient } from "./_shared/data.ts";
import { body, HttpError, requiredString } from "./_shared/http.ts";

const readPermissions = ["client:manage_all", "client:manage_assigned", "client:view_assigned", "client:view_own_safe"];
const managePermissions = ["client:manage_all", "client:manage_assigned"];
const teamPermissions = ["team:manage", "client:manage_all", "client:manage_assigned"];

function cleanClientInput(input: Record<string, unknown>, partial = false) {
  const output: Record<string, unknown> = {};
  if (!partial || input.companyName !== undefined) output.companyName = requiredString(input.companyName, "companyName", 2, 160);
  if (input.status !== undefined || !partial) output.status = typeof input.status === "string" ? input.status : "active";
  if (input.retainerAmount !== undefined) {
    if (input.retainerAmount !== null && (!Number.isFinite(Number(input.retainerAmount)) || Number(input.retainerAmount) < 0)) throw new HttpError(422, "Invalid retainer amount");
    output.retainerAmount = input.retainerAmount === null ? null : Number(input.retainerAmount);
  }
  if (input.retainerCycle !== undefined) output.retainerCycle = input.retainerCycle;
  return output;
}

async function hydrateClient(db: SupabaseClient, client: Record<string, unknown>, role: string) {
  const clientId = client.id as string;
  const [contactsResult, notesResult, assignmentsResult, websitesResult] = await Promise.all([
    db.from("ClientContact").select("*").eq("clientId", clientId),
    db.from("ClientNote").select("*").eq("clientId", clientId).order("createdAt", { ascending: false }),
    db.from("ClientAssignment").select("*").eq("clientId", clientId),
    db.from("Website").select("*").eq("clientId", clientId).order("createdAt", { ascending: false }),
  ]);
  for (const result of [contactsResult, notesResult, assignmentsResult, websitesResult]) if (result.error) throw result.error;

  const assignments = assignmentsResult.data ?? [];
  const userIds = assignments.map((item) => item.userId);
  const usersResult = userIds.length
    ? await db.from("User").select("id, email, fullName, roleId").in("id", userIds)
    : { data: [], error: null };
  if (usersResult.error) throw usersResult.error;
  const roleIds = [...new Set((usersResult.data ?? []).map((item) => item.roleId))];
  const rolesResult = roleIds.length ? await db.from("Role").select("id, name").in("id", roleIds) : { data: [], error: null };
  if (rolesResult.error) throw rolesResult.error;
  const roles = new Map((rolesResult.data ?? []).map((item) => [item.id, item]));
  const users = new Map((usersResult.data ?? []).map((item) => [item.id, { ...item, role: roles.get(item.roleId) }]));
  const enrichedAssignments = assignments.map((item) => ({ ...item, user: users.get(item.userId) }));
  const activeWebsites = (websitesResult.data ?? []).filter((website) => website.status === "active").length;
  const result: Record<string, unknown> = {
    ...client,
    contacts: contactsResult.data ?? [],
    notes: notesResult.data ?? [],
    assignments: enrichedAssignments,
    websites: websitesResult.data ?? [],
    healthScore: Math.min(100, 55 + activeWebsites * 15 + assignments.length * 10),
  };
  if (role === "client") {
    delete result.retainerAmount;
    delete result.retainerCycle;
    delete result.notes;
    delete result.assignments;
  }
  return result;
}

async function listClients(db: SupabaseClient, user: AppUser) {
  let query = db.from("Client").select("*").eq("agencyId", user.agencyId).order("companyName");
  const allowed = clientsFor(user);
  if (allowed !== null) {
    if (!allowed.length) return [];
    query = query.in("id", allowed);
  }
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data ?? []).map((client) => hydrateClient(db, client, user.role)));
}

export async function clientRoutes(req: Request, path: string, db: SupabaseClient) {
  if (!path.startsWith("/clients") && path !== "/team-members") return null;
  const user = await authenticate(req, db);

  if (req.method === "GET" && path === "/clients") {
    requirePermission(user, ...readPermissions);
    return { status: 200, payload: { clients: await listClients(db, user) } };
  }
  if (req.method === "GET" && path === "/team-members") {
    requirePermission(user, ...teamPermissions);
    const { data: roleRows, error: roleError } = await db.from("Role").select("id, name").in("name", ["manager", "employee"]);
    if (roleError) throw roleError;
    const roleMap = new Map((roleRows ?? []).map((item) => [item.id, item]));
    const { data: users, error } = await db.from("User").select("id, fullName, email, roleId").eq("agencyId", user.agencyId).eq("isActive", true).in("roleId", [...roleMap.keys()]).order("fullName");
    if (error) throw error;
    const ids = (users ?? []).map((member) => member.id);
    const assignmentResult = ids.length ? await db.from("ClientAssignment").select("userId, clientId").in("userId", ids) : { data: [], error: null };
    if (assignmentResult.error) throw assignmentResult.error;
    return { status: 200, payload: { users: (users ?? []).map((member) => ({ id: member.id, fullName: member.fullName, email: member.email, role: roleMap.get(member.roleId)?.name, assignedClientIds: (assignmentResult.data ?? []).filter((item) => item.userId === member.id).map((item) => item.clientId) })) } };
  }
  if (req.method === "POST" && path === "/clients") {
    requirePermission(user, ...managePermissions);
    const data = { id: crypto.randomUUID(), agencyId: user.agencyId, ...cleanClientInput(await body(req)) };
    const { data: created, error } = await db.from("Client").insert(data).select("*").single();
    if (error) throw error;
    await activity(db, user.id, "client", created.id, "client.created", { companyName: created.companyName });
    return { status: 201, payload: { client: await hydrateClient(db, created, user.role) } };
  }

  const match = path.match(/^\/clients\/([^/]+)(?:\/(contacts|notes|assignments|websites))?$/);
  if (!match) return null;
  const [, clientId, action] = match;
  const client = await assertClient(db, user, clientId);
  if (req.method === "GET" && !action) {
    requirePermission(user, ...readPermissions);
    return { status: 200, payload: { client: await hydrateClient(db, client, user.role) } };
  }
  if (action === "websites") return null;
  requirePermission(user, ...(action === "assignments" ? teamPermissions : managePermissions));

  if (req.method === "PATCH" && !action) {
    const input = cleanClientInput(await body(req), true);
    const { data: updated, error } = await db.from("Client").update(input).eq("id", clientId).select("*").single();
    if (error) throw error;
    await activity(db, user.id, "client", clientId, "client.updated", input);
    return { status: 200, payload: { client: await hydrateClient(db, updated, user.role) } };
  }
  if (req.method === "DELETE" && !action) {
    const { error } = await db.from("Client").delete().eq("id", clientId);
    if (error) throw error;
    await activity(db, user.id, "client", clientId, "client.deleted");
    return { status: 200, payload: { deleted: true } };
  }

  const input = await body(req);
  if (req.method === "POST" && action === "contacts") {
    if (input.email !== undefined && (typeof input.email !== "string" || !/^\S+@\S+\.\S+$/.test(input.email))) throw new HttpError(422, "Invalid contact email");
    const record = { id: crypto.randomUUID(), clientId, name: input.name ?? null, email: input.email ?? null, phone: input.phone ?? null, roleTitle: input.roleTitle ?? null, isPrimary: Boolean(input.isPrimary) };
    const { data, error } = await db.from("ClientContact").insert(record).select("*").single();
    if (error) throw error;
    await activity(db, user.id, "client", clientId, "client.contact_added", { contactId: data.id });
    return { status: 201, payload: { contact: data } };
  }
  if (req.method === "POST" && action === "notes") {
    const note = requiredString(input.note, "note", 1, 5000);
    const { data, error } = await db.from("ClientNote").insert({ id: crypto.randomUUID(), clientId, authorId: user.id, note }).select("*").single();
    if (error) throw error;
    await activity(db, user.id, "client", clientId, "client.note_added", { noteId: data.id });
    return { status: 201, payload: { note: data } };
  }
  if (req.method === "POST" && action === "assignments") {
    const userId = requiredString(input.userId, "userId");
    const { data: member, error: memberError } = await db.from("User").select("id, roleId").eq("id", userId).eq("agencyId", user.agencyId).eq("isActive", true).maybeSingle();
    if (memberError) throw memberError;
    if (!member) throw new HttpError(422, "Only agency managers and employees can be assigned");
    const { data: role } = await db.from("Role").select("name").eq("id", member.roleId).single();
    if (!role || !["manager", "employee"].includes(role.name)) throw new HttpError(422, "Only agency managers and employees can be assigned");
    const { data: existing } = await db.from("ClientAssignment").select("id").eq("clientId", clientId).eq("userId", userId).maybeSingle();
    if (existing) throw new HttpError(409, "This team member is already assigned to the client");
    const { data, error } = await db.from("ClientAssignment").insert({ id: crypto.randomUUID(), clientId, userId }).select("*").single();
    if (error) throw error;
    await activity(db, user.id, "client", clientId, "client.assigned", { userId });
    return { status: 201, payload: { assignment: data } };
  }
  return null;
}

