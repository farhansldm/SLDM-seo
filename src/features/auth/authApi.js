import { apiRequest } from "../../lib/apiClient.js";

export const signUp = (input) => apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(input) });
export const signIn = (input) => apiRequest("/auth/login", { method: "POST", body: JSON.stringify(input) });
export const signOut = () => apiRequest("/auth/logout", { method: "POST" });
export const getCurrentUser = () => apiRequest("/auth/me");
