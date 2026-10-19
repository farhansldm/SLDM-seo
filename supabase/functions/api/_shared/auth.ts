import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export type RoleName = "admin" | "manager" | "employee" | "client";

export type AppUser = {
  id: string;
  agencyId: string;
  role: RoleName;
  email: string;
  fullName: string | null;
  clientId: string | null;
  assignedClientIds: string[];
  authId: string;
};

const rolePermissions: Record<RoleName, string[]> = {
  admin: ["agency:manage", "team:manage", "client:manage_all", "client:view_internal", "website:manage_all", "keyword:manage_all", "audit:manage_all", "task:manage_all", "report:approve_all", "integration:manage_all", "ai:use_internal"],
  manager: ["client:manage_assigned", "client:view_internal", "website:manage_assigned", "keyword:manage_assigned", "audit:manage_assigned", "task:assign_assigned", "report:approve_assigned", "integration:manage_assigned", "ai:use_internal"],
  employee: ["client:view_assigned", "client:view_internal", "website:view_assigned", "keyword:view_assigned", "audit:view_assigned", "task:update_assigned", "ai:use_internal"],
  client: ["client:view_own_safe", "website:view_own_safe", "dashboard:view_own_safe", "report:view_approved"],
};

export function clientsFor(user: AppUser): string[] | null {
  if (user.role === "admin") return null;
  if (user.role === "client") return user.clientId ? [user.clientId] : [];
  return user.assignedClientIds;
}

export function canAccessClient(user: AppUser, clientId: string) {
  const ids = clientsFor(user);
  return ids === null || ids.includes(clientId);
}

export function requirePermission(user: AppUser, ...permissions: string[]) {
  if (!permissions.some((permission) => rolePermissions[user.role]?.includes(permission))) {
    throw new HttpError(403, "Insufficient permissions");
  }
}

export function createDatabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticate(req: Request, db: SupabaseClient): Promise<AppUser> {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Missing bearer token");

  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) throw new HttpError(401, "Invalid or expired Supabase session");

  const { data: profile, error } = await db
    .from("User")
    .select("id, agencyId, roleId, email, fullName, clientId, isActive")
    .eq("supabaseAuthId", authData.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile || !profile.isActive) throw new HttpError(403, "Application profile not found or inactive");

  const [{ data: role, error: roleError }, { data: assignments, error: assignmentError }] = await Promise.all([
    db.from("Role").select("name").eq("id", profile.roleId).single(),
    db.from("ClientAssignment").select("clientId").eq("userId", profile.id),
  ]);
  if (roleError) throw roleError;
  if (assignmentError) throw assignmentError;

  return {
    id: profile.id,
    agencyId: profile.agencyId,
    role: role.name as RoleName,
    email: profile.email,
    fullName: profile.fullName,
    clientId: profile.clientId,
    assignedClientIds: (assignments ?? []).map((item) => item.clientId),
    authId: authData.user.id,
  };
}

export function publicUser(user: AppUser) {
  const { authId: _authId, ...safe } = user;
  return safe;
}
