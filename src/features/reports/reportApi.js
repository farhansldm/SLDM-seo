import { API_BASE_URL, apiRequest } from "../../lib/apiClient.js";

export const fetchReports = () => apiRequest("/reports");
export const fetchReport = (id) => apiRequest(`/reports/${id}`);
export const createReport = (body) => apiRequest("/reports", { method: "POST", body: JSON.stringify(body) });
export const generateReportPdf = (id) => apiRequest(`/reports/${id}/pdf`, { method: "POST" });
export const approveReport = (id) => apiRequest(`/reports/${id}/approve`, { method: "PATCH" });
export const fetchPortalDashboard = () => apiRequest("/portal/dashboard");

export async function downloadReportPdf(id, title = "seo-report") {
  const response = await fetch(`${API_BASE_URL}/reports/${id}/download`, { credentials: "include" });
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
