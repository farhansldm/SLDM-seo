import { apiRequest } from "../../lib/apiClient.js";

export const fetchSeoDashboard = ({ websiteId }) => apiRequest(`/websites/${websiteId}/seo-dashboard`);
