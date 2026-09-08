import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../server/app.js";
import { roles } from "../shared/permissions.js";

class MemoryUserRepository {
  constructor() {
    this.users = new Map([
      ["admin-auth", { id: "admin-1", agencyId: "agency-1", email: "admin@test.dev", isActive: true, role: { name: roles.ADMIN }, assignments: [] }],
      ["manager-auth", { id: "manager-1", agencyId: "agency-1", email: "manager@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["employee-auth", { id: "employee-1", agencyId: "agency-1", email: "employee@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["employee-2-auth", { id: "employee-2", agencyId: "agency-1", email: "employee2@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-2" }] }],
      ["client-auth", { id: "client-user", agencyId: "agency-1", email: "client@test.dev", isActive: true, clientId: "client-1", role: { name: roles.CLIENT }, assignments: [] }],
      ["other-auth", { id: "manager-9", agencyId: "agency-9", email: "other@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-9" }] }],
    ]);
  }

  async findUserBySupabaseAuthId(id) { return this.users.get(id) ?? null; }
}

class FakeSupabaseAuthProvider {
  async verifyAccessToken(token) { return { id: token, email: `${token}@test.dev` }; }
}

class MemoryTaskRepository {
  constructor() {
    this.clients = new Map([
      ["client-1", { id: "client-1", agencyId: "agency-1", companyName: "Alpha" }],
      ["client-2", { id: "client-2", agencyId: "agency-1", companyName: "Beta" }],
      ["client-9", { id: "client-9", agencyId: "agency-9", companyName: "Other" }],
    ]);
    this.websites = new Map([["website-1", { id: "website-1", clientId: "client-1", domain: "alpha.test", client: this.clients.get("client-1") }]]);
    this.users = new Map([
      ["manager-1", { id: "manager-1", agencyId: "agency-1", fullName: "Manager", email: "manager@test.dev", isActive: true, role: { name: roles.MANAGER }, assignments: [{ clientId: "client-1" }] }],
      ["employee-1", { id: "employee-1", agencyId: "agency-1", fullName: "Employee", email: "employee@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-1" }] }],
      ["employee-2", { id: "employee-2", agencyId: "agency-1", fullName: "Employee 2", email: "employee2@test.dev", isActive: true, role: { name: roles.EMPLOYEE }, assignments: [{ clientId: "client-2" }] }],
    ]);
    this.tasks = [];
    this.activities = [];
    this.notifications = [];
    this.alerts = [];
  }

  hydrate(task) {
    return { ...task, client: this.clients.get(task.clientId), website: task.websiteId ? this.websites.get(task.websiteId) : null };
  }

  async listTasks(where) {
    return this.tasks.filter((task) => {
      if (where.client?.agencyId && this.clients.get(task.clientId)?.agencyId !== where.client.agencyId) return false;
      if (where.clientId?.in && !where.clientId.in.includes(task.clientId)) return false;
      if (where.AND?.some((condition) => condition.clientId && condition.clientId !== task.clientId)) return false;
      if (where.websiteId && where.websiteId !== task.websiteId) return false;
      if (where.status && where.status !== task.status) return false;
      if (where.assignedTo && where.assignedTo !== task.assignedTo) return false;
      return true;
    }).map((task) => this.hydrate(task));
  }

  async findTaskById(id) { const task = this.tasks.find((item) => item.id === id); return task ? this.hydrate(task) : null; }
  async findClientById(id) { return this.clients.get(id) ?? null; }
  async findWebsiteById(id) { return this.websites.get(id) ?? null; }
  async findUserById(id) { return this.users.get(id) ?? null; }
  async listWorkers(agencyId) { return [...this.users.values()].filter((user) => user.agencyId === agencyId); }

  async createTask(data) {
    const task = { id: `task-${this.tasks.length + 1}`, createdAt: new Date(), comments: [], attachments: [], ...data };
    this.tasks.push(task);
    return this.hydrate(task);
  }

  async updateTask(id, data) { const task = this.tasks.find((item) => item.id === id); Object.assign(task, data); return this.hydrate(task); }
  async deleteTask(id) { const index = this.tasks.findIndex((item) => item.id === id); return this.tasks.splice(index, 1)[0]; }

  async createComment(taskId, data) {
    const comment = { id: `comment-${Date.now()}`, createdAt: new Date(), ...data, author: this.users.get(data.authorId) };
    this.tasks.find((task) => task.id === taskId).comments.push(comment);
    return comment;
  }

  async createAttachment(taskId, data) {
    const attachment = { id: `attachment-${Date.now()}`, uploadedAt: new Date(), ...data };
    this.tasks.find((task) => task.id === taskId).attachments.push(attachment);
    return attachment;
  }

  async createActivity(data) { const activity = { id: `activity-${this.activities.length + 1}`, ...data }; this.activities.push(activity); return activity; }
  async createNotification(data) { const item = { id: `notification-${this.notifications.length + 1}`, isRead: false, createdAt: new Date(), ...data }; this.notifications.push(item); return item; }
  async listNotifications(userId) { return this.notifications.filter((item) => item.userId === userId); }
  async findNotification(id) { return this.notifications.find((item) => item.id === id) ?? null; }
  async markNotificationRead(id) { const item = await this.findNotification(id); item.isRead = true; return item; }
  async listAlerts(where) { return this.alerts.filter((item) => item.agencyId === where.agencyId && (!where.clientId?.in || where.clientId.in.includes(item.clientId)) && (!where.status || item.status === where.status)); }
  async findAlert(id) { const item = this.alerts.find((alert) => alert.id === id); return item ? { ...item, client: this.clients.get(item.clientId) } : null; }
  async findOpenTaskAlert(taskId) { return this.alerts.find((item) => item.entityId === taskId && item.status === "open") ?? null; }
  async createAlert(data) { const item = { id: `alert-${this.alerts.length + 1}`, status: "open", createdAt: new Date(), ...data }; this.alerts.push(item); return item; }
  async resolveAlert(id) { const item = this.alerts.find((alert) => alert.id === id); Object.assign(item, { status: "resolved", resolvedAt: new Date() }); return item; }
}

function makeApp(repository = new MemoryTaskRepository()) {
  return {
    app: createApp({ userRepository: new MemoryUserRepository(), authProvider: new FakeSupabaseAuthProvider(), taskRepository: repository }),
    repository,
  };
}

async function createAssignedTask(app, overrides = {}) {
  return request(app)
    .post("/api/v1/tasks")
    .set("Authorization", "Bearer manager-auth")
    .send({ clientId: "client-1", websiteId: "website-1", assignedTo: "employee-1", title: "Fix canonical tags", priority: "high", deadline: new Date(Date.now() + 3600000).toISOString(), ...overrides });
}

describe("task workflow routes", () => {
  it("creates and assigns a task with notification, alert, and activity", async () => {
    const setup = makeApp();
    const response = await createAssignedTask(setup.app);

    expect(response.status).toBe(201);
    expect(response.body.task).toMatchObject({ status: "todo", assignedTo: "employee-1", clientId: "client-1" });
    expect(setup.repository.notifications[0]).toMatchObject({ userId: "employee-1", isRead: false });
    expect(setup.repository.alerts[0]).toMatchObject({ alertType: "task_deadline", status: "open" });
    expect(setup.repository.activities.map((item) => item.action)).toContain("task.created");
  });

  it("enforces employee ownership and status transitions", async () => {
    const setup = makeApp();
    const created = await createAssignedTask(setup.app);
    const taskId = created.body.task.id;

    const invalidTransition = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer employee-auth").send({ status: "done" });
    const started = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer employee-auth").send({ status: "in_progress" });
    const forbiddenEdit = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer employee-auth").send({ title: "Changed" });
    const cancelled = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer employee-auth").send({ status: "cancelled" });
    const otherEmployee = await request(setup.app).get(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer employee-2-auth");

    expect(invalidTransition.status).toBe(409);
    expect(started.status).toBe(200);
    expect(started.body.task.status).toBe("in_progress");
    expect(forbiddenEdit.status).toBe(403);
    expect(cancelled.status).toBe(200);
    expect(otherEmployee.status).toBe(404);
  });

  it("supports comments and attachment metadata", async () => {
    const setup = makeApp();
    const created = await createAssignedTask(setup.app, { deadline: null });
    const taskId = created.body.task.id;

    const comment = await request(setup.app).post(`/api/v1/tasks/${taskId}/comments`).set("Authorization", "Bearer employee-auth").send({ comment: "Canonical updated on staging." });
    const attachment = await request(setup.app).post(`/api/v1/tasks/${taskId}/attachments`).set("Authorization", "Bearer employee-auth").send({ fileUrl: "https://files.test/canonical-proof.png" });

    expect(comment.status).toBe(201);
    expect(comment.body.comment).toMatchObject({ isInternal: true, authorId: "employee-1" });
    expect(attachment.status).toBe(201);
    expect(attachment.body.attachment.fileUrl).toContain("canonical-proof.png");
  });

  it("supports manager reassignment, editing, completion, and deletion", async () => {
    const setup = makeApp();
    const created = await createAssignedTask(setup.app);
    const taskId = created.body.task.id;

    const edited = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer manager-auth").send({ title: "Fix all canonical tags", assignedTo: null });
    await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer manager-auth").send({ status: "in_progress" });
    const completed = await request(setup.app).patch(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer manager-auth").send({ status: "done" });
    const removed = await request(setup.app).delete(`/api/v1/tasks/${taskId}`).set("Authorization", "Bearer manager-auth");

    expect(edited.body.task).toMatchObject({ title: "Fix all canonical tags", assignedTo: null });
    expect(completed.body.task.status).toBe("done");
    expect(setup.repository.alerts[0].status).toBe("resolved");
    expect(removed.body.deleted).toBe(true);
    expect(setup.repository.activities.map((item) => item.action)).toContain("task.deleted");
  });

  it("returns My Tasks and manager workload summaries", async () => {
    const setup = makeApp();
    await createAssignedTask(setup.app, { deadline: null });
    await request(setup.app).post("/api/v1/tasks").set("Authorization", "Bearer admin-auth").send({ clientId: "client-1", title: "Unassigned research", priority: "medium" });

    const mine = await request(setup.app).get("/api/v1/tasks/my").set("Authorization", "Bearer employee-auth");
    const workload = await request(setup.app).get("/api/v1/tasks/workload").set("Authorization", "Bearer manager-auth");

    expect(mine.body.tasks).toHaveLength(1);
    expect(workload.status).toBe(200);
    expect(workload.body.workload.find((item) => item.user.id === "employee-1").total).toBe(1);
    expect(workload.body.unassigned).toBe(1);
  });

  it("keeps notifications private and lets managers resolve scoped alerts", async () => {
    const setup = makeApp();
    await createAssignedTask(setup.app);
    const notificationId = setup.repository.notifications[0].id;
    const alertId = setup.repository.alerts[0].id;

    const employeeInbox = await request(setup.app).get("/api/v1/notifications").set("Authorization", "Bearer employee-auth");
    const wrongUser = await request(setup.app).patch(`/api/v1/notifications/${notificationId}/read`).set("Authorization", "Bearer manager-auth");
    const read = await request(setup.app).patch(`/api/v1/notifications/${notificationId}/read`).set("Authorization", "Bearer employee-auth");
    const resolved = await request(setup.app).patch(`/api/v1/alerts/${alertId}/resolve`).set("Authorization", "Bearer manager-auth");

    expect(employeeInbox.body.notifications).toHaveLength(1);
    expect(wrongUser.status).toBe(404);
    expect(read.body.notification.isRead).toBe(true);
    expect(resolved.body.alert.status).toBe("resolved");
  });

  it("rejects invalid assignments, clients, and cross-tenant access", async () => {
    const setup = makeApp();
    const invalidAssignee = await createAssignedTask(setup.app, { assignedTo: "employee-2" });
    const clientAccess = await request(setup.app).get("/api/v1/tasks").set("Authorization", "Bearer client-auth");
    const otherTenant = await request(setup.app).post("/api/v1/tasks").set("Authorization", "Bearer other-auth").send({ clientId: "client-1", title: "Cross tenant" });

    expect(invalidAssignee.status).toBe(422);
    expect(clientAccess.status).toBe(403);
    expect(otherTenant.status).toBe(404);
  });
});
