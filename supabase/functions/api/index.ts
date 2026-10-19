import { createDatabaseClient } from "./_shared/auth.ts";
import { corsHeaders, fail, json } from "./_shared/http.ts";
import { authRoutes } from "./auth.ts";
import { clientRoutes } from "./clients.ts";
import { websiteRoutes } from "./websites.ts";
import { keywordRoutes } from "./keywords.ts";
import { dashboardRoutes } from "./dashboard.ts";
import { auditRoutes } from "./audits.ts";
import { taskRoutes } from "./operations.ts";
import { aiRoutes, reportRoutes } from "./reports-ai.ts";

function apiPath(req: Request) {
  const pathname = new URL(req.url).pathname;
  const normalized = pathname.replace(/^.*\/api(?=\/|$)/, "");
  return normalized || "/";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const path = apiPath(req);
    if (req.method === "GET" && path === "/health") return json({ status: "ok", runtime: "supabase-edge" });
    const db = createDatabaseClient();
    const result = await authRoutes(req, path, db)
      ?? await clientRoutes(req, path, db)
      ?? await websiteRoutes(req, path, db)
      ?? await keywordRoutes(req, path, db)
      ?? await dashboardRoutes(req, path, db)
      ?? await auditRoutes(req, path, db)
      ?? await taskRoutes(req, path, db)
      ?? await reportRoutes(req, path, db)
      ?? await aiRoutes(req, path, db);
    if (!result) return json({ error: "Not found", path }, 404);
    if (result.contentType) return new Response(String(result.payload), { status: result.status, headers: { ...corsHeaders, "Content-Type": result.contentType, ...(result.headers ?? {}) } });
    return json(result.payload, result.status);
  } catch (error) {
    return fail(error);
  }
});
