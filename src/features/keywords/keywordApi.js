const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export async function fetchKeywordDashboard({ accessToken, websiteId, filters }) {
  const query = buildQuery(filters);
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

export async function createKeyword({ accessToken, websiteId, input }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse(response);
}

export async function importKeywords({ accessToken, websiteId, csv }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  return parseResponse(response);
}

export async function generateRankings({ accessToken, websiteId, days }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords/generate-rankings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  return parseResponse(response);
}

export async function exportKeywords({ accessToken, websiteId, filters }) {
  const query = buildQuery(filters);
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/keywords/export${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Export failed");
  }
  return response.text();
}
