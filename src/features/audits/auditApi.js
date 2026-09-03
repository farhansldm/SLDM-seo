const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

export async function fetchAuditRuns({ accessToken, websiteId }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/audits`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

export async function runTechnicalAudit({ accessToken, websiteId }) {
  const response = await fetch(`${API_BASE_URL}/websites/${websiteId}/audits/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

export async function fetchAuditRun({ accessToken, crawlRunId }) {
  const response = await fetch(`${API_BASE_URL}/audits/${crawlRunId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

export async function createTaskFromCheck({ accessToken, checkId }) {
  const response = await fetch(`${API_BASE_URL}/technical-checks/${checkId}/create-task`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}
