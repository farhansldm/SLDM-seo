const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

async function request(path, accessToken, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload;
}

export const fetchTasks = (token, query = "") => request(`/tasks${query}`, token);
export const fetchMyTasks = (token) => request("/tasks/my", token);
export const fetchTask = (token, id) => request(`/tasks/${id}`, token);
export const createTask = (token, body) => request("/tasks", token, { method: "POST", body: JSON.stringify(body) });
export const updateTask = (token, id, body) => request(`/tasks/${id}`, token, { method: "PATCH", body: JSON.stringify(body) });
export const deleteTask = (token, id) => request(`/tasks/${id}`, token, { method: "DELETE" });
export const addTaskComment = (token, id, comment) => request(`/tasks/${id}/comments`, token, { method: "POST", body: JSON.stringify({ comment }) });
export const addTaskAttachment = (token, id, fileUrl) => request(`/tasks/${id}/attachments`, token, { method: "POST", body: JSON.stringify({ fileUrl }) });
export const fetchWorkload = (token) => request("/tasks/workload", token);
export const fetchNotifications = (token) => request("/notifications", token);
export const readNotification = (token, id) => request(`/notifications/${id}/read`, token, { method: "PATCH" });
export const fetchAlerts = (token) => request("/alerts?status=open", token);
export const resolveAlert = (token, id) => request(`/alerts/${id}/resolve`, token, { method: "PATCH" });
