import { API_BASE_URL, apiRequest } from "../../lib/apiClient.js";

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

export function fetchKeywordDashboard({ websiteId, filters }) {
  const query = buildQuery(filters);
  return apiRequest(`/websites/${websiteId}/keywords${query ? `?${query}` : ""}`);
}
export const createKeyword = ({ websiteId, input }) => apiRequest(`/websites/${websiteId}/keywords`, { method: "POST", body: JSON.stringify(input) });
export const importKeywords = ({ websiteId, csv }) => apiRequest(`/websites/${websiteId}/keywords/import`, { method: "POST", body: JSON.stringify({ csv }) });
export const generateRankings = ({ websiteId, days }) => apiRequest(`/websites/${websiteId}/keywords/generate-rankings`, { method: "POST", body: JSON.stringify({ days }) });

export async function exportKeywords({ websiteId, filters }) {
  const query = buildQuery(filters);
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords/export${query ? `?${query}` : ""}`, { credentials: "include" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Export failed");
  }
  return response.text();
}
