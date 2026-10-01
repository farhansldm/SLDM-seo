import { apiRequest } from "../../lib/apiClient.js";

export const fetchAuditRuns = ({ websiteId }) => apiRequest(`/websites/${websiteId}/audits`);
export const runTechnicalAudit = ({ websiteId }) => apiRequest(`/websites/${websiteId}/audits/run`, { method: "POST" });
export const fetchAuditRun = ({ crawlRunId }) => apiRequest(`/audits/${crawlRunId}`);
export const createTaskFromCheck = ({ checkId }) => apiRequest(`/technical-checks/${checkId}/create-task`, { method: "POST" });
export const setAuditCheckResolution = ({ checkId, resolved }) => apiRequest(`/technical-checks/${checkId}/resolution`, { method: "PATCH", body: JSON.stringify({ resolved }) });
