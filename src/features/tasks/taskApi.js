import { apiRequest } from "../../lib/apiClient.js";

export const fetchTasks = (query = "") => apiRequest(`/tasks${query}`);
export const fetchMyTasks = () => apiRequest("/tasks/my");
export const fetchTask = (id) => apiRequest(`/tasks/${id}`);
export const createTask = (body) => apiRequest("/tasks", { method: "POST", body: JSON.stringify(body) });
export const updateTask = (id, body) => apiRequest(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteTask = (id) => apiRequest(`/tasks/${id}`, { method: "DELETE" });
export const addTaskComment = (id, comment) => apiRequest(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ comment }) });
export const addTaskAttachment = (id, fileUrl) => apiRequest(`/tasks/${id}/attachments`, { method: "POST", body: JSON.stringify({ fileUrl }) });
export const fetchWorkload = () => apiRequest("/tasks/workload");
export const fetchNotifications = () => apiRequest("/notifications");
export const readNotification = (id) => apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
export const fetchAlerts = () => apiRequest("/alerts?status=open");
export const resolveAlert = (id) => apiRequest(`/alerts/${id}/resolve`, { method: "PATCH" });
