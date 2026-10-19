import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AppUser } from "./auth.ts";
import { canAccessClient } from "./auth.ts";
import { HttpError } from "./http.ts";

export async function one<T>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  if (!data) throw new HttpError(404, "Record not found");
  return data;
}

export async function assertClient(db: SupabaseClient, user: AppUser, clientId: string) {
  const { data, error } = await db.from("Client").select("*").eq("id", clientId).maybeSingle();
  if (error) throw error;
  if (!data || data.agencyId !== user.agencyId || !canAccessClient(user, clientId)) {
    throw new HttpError(404, "Client not found or access denied");
  }
  return data;
}

export async function assertWebsite(db: SupabaseClient, user: AppUser, websiteId: string) {
  const { data, error } = await db.from("Website").select("*").eq("id", websiteId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Website not found or access denied");
  await assertClient(db, user, data.clientId);
  return data;
}

export async function activity(db: SupabaseClient, userId: string, entityType: string, entityId: string, action: string, metadata: unknown = {}) {
  const { error } = await db.from("Activity").insert({ id: crypto.randomUUID(), actorId: userId, entityType, entityId, action, metadata });
  if (error) throw error;
}

export const tabs = (websiteId: string) =>
  ["overview", "keywords", "audits", "competitors", "backlinks", "content", "tasks", "reports"]
    .map((tab) => ({ tab, path: `/websites/${websiteId}/${tab}` }));

