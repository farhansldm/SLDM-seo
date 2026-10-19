export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return json({ error: error.message, ...(error.details ? { issues: error.details } : {}) }, error.status);
  }
  console.error(error);
  return json({ error: "Internal server error" }, 500);
}

export async function body(req: Request) {
  try {
    return await req.json() as Record<string, unknown>;
  } catch {
    throw new HttpError(422, "Invalid JSON request body");
  }
}

export function requiredString(value: unknown, field: string, min = 1, max = 250) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new HttpError(422, "Invalid request", [{ field, message: `Must contain ${min}-${max} characters` }]);
  }
  return value.trim();
}

