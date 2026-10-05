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
  let response = await sendRequest(path, options, await getAuthHeaders());

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      response = await sendRequest(path, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${data.session.access_token}` },
      }, {});
    }
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}
