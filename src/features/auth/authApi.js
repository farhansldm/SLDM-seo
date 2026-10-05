import { apiRequest } from "../../lib/apiClient.js";

function sessionHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const bootstrapAgencyAdmin = (input, accessToken) => apiRequest("/auth/bootstrap-agency", {
  method: "POST",
  body: JSON.stringify(input),
  headers: sessionHeaders(accessToken),
});

export const getCurrentUser = (accessToken) => apiRequest("/auth/me", {
  headers: sessionHeaders(accessToken),
});
