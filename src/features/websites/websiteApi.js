import { apiRequest } from "../../lib/apiClient.js";

export const fetchWebsites = (clientId) => apiRequest(`/clients/${clientId}/websites`);
export const createWebsite = (clientId, input) => apiRequest(`/clients/${clientId}/websites`, { method: "POST", body: JSON.stringify(input) });
export const updateWebsite = (websiteId, input) => apiRequest(`/websites/${websiteId}`, { method: "PATCH", body: JSON.stringify(input) });
export const createCompetitor = (websiteId, input) => apiRequest(`/websites/${websiteId}/competitors`, { method: "POST", body: JSON.stringify(input) });
export const updateCompetitor = (competitorId, input) => apiRequest(`/competitors/${competitorId}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteCompetitor = (competitorId) => apiRequest(`/competitors/${competitorId}`, { method: "DELETE" });
