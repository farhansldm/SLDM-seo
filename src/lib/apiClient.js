import { supabase } from "../features/auth/supabaseClient.js";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export async function getAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function sendRequest(path, options, authHeaders) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
}

export async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await sendRequest(path, options, await getAuthHeaders());
  } catch {
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      try {
        response = await sendRequest(path, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${data.session.access_token}` },
        }, {});
      } catch {
        throw new Error("Unable to reach the server. Check your connection and try again.");
      }
    }
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403) throw new Error(payload.error ?? "You do not have permission for this action.");
    if (response.status >= 500) throw new Error(payload.error ?? "The service is temporarily unavailable. Try again shortly.");
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}
