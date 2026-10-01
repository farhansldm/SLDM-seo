import { apiRequest } from "../../lib/apiClient.js";

export const fetchAiWorkflows = () => apiRequest("/ai/workflows");
export const fetchAiHistory = (clientId = "") => apiRequest(`/ai/history${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`);
export const generateAiResearch = (body) => apiRequest("/ai/generate", { method: "POST", body: JSON.stringify(body) });
export const reviewAiResearch = (id, reviewStatus) => apiRequest(`/ai/history/${id}/review`, { method: "PATCH", body: JSON.stringify({ reviewStatus }) });
