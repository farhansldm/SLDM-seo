import { apiRequest } from "../../lib/apiClient.js";

export const bootstrapAgencyAdmin = (input) => apiRequest("/auth/bootstrap-agency", {
  method: "POST",
  body: JSON.stringify(input),
});

export const getCurrentUser = () => apiRequest("/auth/me");
