const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function request(path, accessToken, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

export const fetchReports = (token) => request("/reports", token);
export const fetchReport = (token, id) => request(`/reports/${id}`, token);
export const createReport = (token, body) => request("/reports", token, { method: "POST", body: JSON.stringify(body) });
export const generateReportPdf = (token, id) => request(`/reports/${id}/pdf`, token, { method: "POST" });
export const approveReport = (token, id) => request(`/reports/${id}/approve`, token, { method: "PATCH" });
export const fetchPortalDashboard = (token) => request("/portal/dashboard", token);

export async function downloadReportPdf(accessToken, id, title = "seo-report") {
  const response = await fetch(`${API_BASE_URL}/reports/${id}/download`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "PDF download failed");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
