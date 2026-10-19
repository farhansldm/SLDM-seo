import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { authenticate, requirePermission, type AppUser } from "./_shared/auth.ts";
import { activity, assertClient, assertWebsite, tabs } from "./_shared/data.ts";
import { body, HttpError, requiredString } from "./_shared/http.ts";

const readPermissions = ["website:manage_all", "website:manage_assigned", "website:view_assigned", "website:view_own_safe"];
const managePermissions = ["website:manage_all", "website:manage_assigned"];

function websiteInput(input: Record<string, unknown>, partial = false) {
  const output: Record<string, unknown> = {};
  if (!partial || input.domain !== undefined) output.domain = requiredString(input.domain, "domain", 3, 255);
  if (!partial || input.status !== undefined) output.status = typeof input.status === "string" ? input.status : "active";
  for (const field of ["cms", "businessCategory", "preferredLocale", "primaryCountry"]) if (input[field] !== undefined) output[field] = input[field];
  if (input.seoScore !== undefined) {
    const score = input.seoScore === null ? null : Number(input.seoScore);
    if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) throw new HttpError(422, "SEO score must be between 0 and 100");
    output.seoScore = score;
  }
  if (!partial || input.targetLocations !== undefined) output.targetLocations = Array.isArray(input.targetLocations) ? input.targetLocations : [];
  if (!partial || input.targetSearchEngines !== undefined) output.targetSearchEngines = Array.isArray(input.targetSearchEngines) ? input.targetSearchEngines : ["google"];
  if (!partial || input.isMock !== undefined) output.isMock = input.isMock === undefined ? true : Boolean(input.isMock);
  return output;
}

async function hydrateWebsite(db: SupabaseClient, website: Record<string, unknown>) {
  const { data: client, error: clientError } = await db.from("Client").select("*").eq("id", website.clientId).single();
  if (clientError) throw clientError;
  const { data: competitors, error } = await db.from("Competitor").select("*").eq("websiteId", website.id).order("createdAt", { ascending: false });
  if (error) throw error;
  const competitorIds = (competitors ?? []).map((item) => item.id);
  const backlinksResult = competitorIds.length ? await db.from("CompetitorBacklink").select("*").in("competitorId", competitorIds) : { data: [], error: null };
  if (backlinksResult.error) throw backlinksResult.error;
  return {
    ...website,
    client,
    competitors: (competitors ?? []).map((competitor) => ({ ...competitor, backlinks: (backlinksResult.data ?? []).filter((item) => item.competitorId === competitor.id) })),
    tabs: tabs(website.id as string),
  };
}

async function competitorAccess(db: SupabaseClient, user: AppUser, competitorId: string) {
  const { data, error } = await db.from("Competitor").select("*").eq("id", competitorId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Website not found or access denied");
  await assertWebsite(db, user, data.websiteId);
  return data;
}

export async function websiteRoutes(req: Request, path: string, db: SupabaseClient) {
  if (!path.includes("/websites") && !path.startsWith("/competitors/")) return null;
  const user = await authenticate(req, db);
  const listMatch = path.match(/^\/clients\/([^/]+)\/websites$/);
  if (listMatch) {
    const clientId = listMatch[1];
    await assertClient(db, user, clientId);
    if (req.method === "GET") {
      requirePermission(user, ...readPermissions);
      const { data, error } = await db.from("Website").select("*").eq("clientId", clientId).order("createdAt", { ascending: false });
      if (error) throw error;
      return { status: 200, payload: { websites: await Promise.all((data ?? []).map((website) => hydrateWebsite(db, website))) } };
    }
    if (req.method === "POST") {
      requirePermission(user, ...managePermissions);
      const record = { id: crypto.randomUUID(), clientId, ...websiteInput(await body(req)) };
      const { data, error } = await db.from("Website").insert(record).select("*").single();
      if (error) throw error;
      await activity(db, user.id, "website", data.id, "website.created", { domain: data.domain });
      return { status: 201, payload: { website: await hydrateWebsite(db, data) } };
    }
  }

  const websiteMatch = path.match(/^\/websites\/([^/]+)(?:\/(competitors))?$/);
  if (websiteMatch) {
    requirePermission(user, ...managePermissions);
    const websiteId = websiteMatch[1];
    const website = await assertWebsite(db, user, websiteId);
    if (req.method === "PATCH" && !websiteMatch[2]) {
      const input = websiteInput(await body(req), true);
      const { data, error } = await db.from("Website").update(input).eq("id", websiteId).select("*").single();
      if (error) throw error;
      await activity(db, user.id, "website", websiteId, "website.updated", input);
      return { status: 200, payload: { website: await hydrateWebsite(db, data) } };
    }
    if (req.method === "DELETE" && !websiteMatch[2]) {
      const { error } = await db.from("Website").delete().eq("id", websiteId);
      if (error) throw error;
      await activity(db, user.id, "website", websiteId, "website.deleted");
      return { status: 200, payload: { deleted: true } };
    }
    if (req.method === "POST" && websiteMatch[2] === "competitors") {
      const input = await body(req);
      const domain = requiredString(input.domain, "domain", 3, 255);
      const record = { id: crypto.randomUUID(), agencyId: user.agencyId, clientId: website.clientId, websiteId, domain, name: input.name ?? null, notes: input.notes ?? null, priority: input.priority ?? "medium", source: input.source ?? "manual" };
      const { data, error } = await db.from("Competitor").insert(record).select("*").single();
      if (error) throw error;
      const backlink = { id: crypto.randomUUID(), competitorId: data.id, sourceUrl: `https://${domain}/resources`, targetUrl: `https://${website.domain}/`, domainAuthority: 42, anchorText: input.name ?? domain, isDofollow: true, source: "mock" };
      const { error: backlinkError } = await db.from("CompetitorBacklink").insert(backlink);
      if (backlinkError) throw backlinkError;
      await activity(db, user.id, "competitor", data.id, "competitor.created", { domain });
      return { status: 201, payload: { competitor: { ...data, backlinks: [backlink] } } };
    }
  }

  const competitorMatch = path.match(/^\/competitors\/([^/]+)$/);
  if (competitorMatch) {
    requirePermission(user, ...managePermissions);
    const competitor = await competitorAccess(db, user, competitorMatch[1]);
    if (req.method === "PATCH") {
      const input = await body(req);
      const allowed = Object.fromEntries(Object.entries(input).filter(([key]) => ["domain", "name", "notes", "priority", "source"].includes(key)));
      if (allowed.domain !== undefined) allowed.domain = requiredString(allowed.domain, "domain", 3, 255);
      const { data, error } = await db.from("Competitor").update(allowed).eq("id", competitor.id).select("*").single();
      if (error) throw error;
      const { data: backlinks, error: backlinkError } = await db.from("CompetitorBacklink").select("*").eq("competitorId", competitor.id);
      if (backlinkError) throw backlinkError;
      return { status: 200, payload: { competitor: { ...data, backlinks } } };
    }
    if (req.method === "DELETE") {
      const { error } = await db.from("Competitor").delete().eq("id", competitor.id);
      if (error) throw error;
      return { status: 200, payload: { deleted: true } };
    }
  }
  return null;
}

