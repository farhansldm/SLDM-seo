const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}

export async function fetchSeoDashboard({ accessToken, websiteId }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/seo-dashboard`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}
