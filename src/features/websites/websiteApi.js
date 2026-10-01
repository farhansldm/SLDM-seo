import { apiRequest } from "../../lib/apiClient.js";

export const fetchWebsites = (clientId) => apiRequest(`/clients/${clientId}/websites`);
export const createWebsite = (clientId, input) => apiRequest(`/clients/${clientId}/websites`, { method: "POST", body: JSON.stringify(input) });
export const createCompetitor = (websiteId, input) => apiRequest(`/websites/${websiteId}/competitors`, { method: "POST", body: JSON.stringify(input) });
