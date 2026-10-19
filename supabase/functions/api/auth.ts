import type { SupabaseClient, User as SupabaseUser } from "npm:@supabase/supabase-js@2";
import { authenticate, publicUser } from "./_shared/auth.ts";
import { body, HttpError, requiredString } from "./_shared/http.ts";

async function roleFor(db: SupabaseClient, name: string) {
  const { data, error } = await db.from("Role").select("id").eq("name", name).maybeSingle();
  if (error) throw error;
  if (data) return data.id;
  const { data: created, error: createError } = await db.from("Role").insert({ name }).select("id").single();
  if (createError) throw createError;
  return created.id;
}

async function authIdentity(req: Request, db: SupabaseClient): Promise<SupabaseUser> {
  const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Missing bearer token");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired Supabase session");
  return data.user;
}

export async function authRoutes(req: Request, path: string, db: SupabaseClient) {
  if (req.method === "GET" && path === "/auth/me") {
    return { status: 200, payload: { user: publicUser(await authenticate(req, db)) } };
  }
  if (req.method !== "POST" || path !== "/auth/bootstrap-agency") return null;

  const identity = await authIdentity(req, db);
  const email = identity.email?.toLowerCase();
  if (!email) throw new HttpError(422, "Supabase user email is required");
  const input = await body(req);
  const agencyName = requiredString(input.agencyName, "agencyName", 2, 120);
  const fullName = requiredString(input.fullName, "fullName", 2, 120);

  const { data: linked, error: linkedError } = await db.from("User").select("*").eq("supabaseAuthId", identity.id).maybeSingle();
  if (linkedError) throw linkedError;
  if (linked) return { status: 200, payload: { user: publicUser(await authenticate(req, db)) } };

  const { data: emailUser, error: emailError } = await db.from("User").select("*").eq("email", email).maybeSingle();
  if (emailError) throw emailError;
  if (emailUser) {
    if (emailUser.supabaseAuthId) throw new HttpError(409, "Email already exists in this workspace");
    const { error } = await db.from("User").update({ supabaseAuthId: identity.id, updatedAt: new Date().toISOString() }).eq("id", emailUser.id);
    if (error) throw error;
    return { status: 200, payload: { user: publicUser(await authenticate(req, db)) } };
  }

  const agencyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const adminRoleId = await roleFor(db, "admin");
  const { error: agencyError } = await db.from("Agency").insert({ id: agencyId, name: agencyName });
  if (agencyError) throw agencyError;
  const { error: userError } = await db.from("User").insert({
    id: userId, agencyId, roleId: adminRoleId, email, fullName, supabaseAuthId: identity.id,
    emailVerifiedAt: identity.email_confirmed_at ?? null, updatedAt: new Date().toISOString(),
  });
  if (userError) {
    await db.from("Agency").delete().eq("id", agencyId);
    throw userError;
  }
  return { status: 201, payload: { user: publicUser(await authenticate(req, db)) } };
}

