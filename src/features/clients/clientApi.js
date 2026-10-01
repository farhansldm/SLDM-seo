import { apiRequest } from "../../lib/apiClient.js";

export const fetchClients = () => apiRequest("/clients");
export const createClient = (input) => apiRequest("/clients", { method: "POST", body: JSON.stringify(input) });
export const addClientContact = (clientId, input) => apiRequest(`/clients/${clientId}/contacts`, { method: "POST", body: JSON.stringify(input) });
export const addClientNote = (clientId, note) => apiRequest(`/clients/${clientId}/notes`, { method: "POST", body: JSON.stringify({ note }) });
export const assignClientUser = (clientId, userId) => apiRequest(`/clients/${clientId}/assignments`, { method: "POST", body: JSON.stringify({ userId }) });
