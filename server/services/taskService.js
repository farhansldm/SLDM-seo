import { roles } from "../../shared/permissions.js";
import { canAccessClient } from "../../shared/tenantScope.js";

const transitions = Object.freeze({
  todo: ["in_progress", "cancelled"],
  in_progress: ["todo", "blocked", "done", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  done: ["in_progress"],
  cancelled: ["todo"],
});

function taskWhere(user, filters = {}, myTasks = false) {
  const where = {};
  if (user.role === roles.ADMIN) where.client = { agencyId: user.agencyId };
  else where.clientId = { in: user.assignedClientIds };
  if (user.role === roles.EMPLOYEE || myTasks) where.assignedTo = user.id;
  if (filters.clientId) where.AND = [...(where.AND ?? []), { clientId: filters.clientId }];
  if (filters.websiteId) where.websiteId = filters.websiteId;
  if (filters.status) where.status = filters.status;
  if (filters.assignedTo && user.role !== roles.EMPLOYEE && !myTasks) where.assignedTo = filters.assignedTo;
  return where;
}

function assertClientAccess(user, client) {
  if (!client || client.agencyId !== user.agencyId || !canAccessClient(user, client.id)) {
    const error = new Error("Client not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function assertTaskAccess(user, task) {
  if (!task || task.client.agencyId !== user.agencyId || !canAccessClient(user, task.clientId)) {
    const error = new Error("Task not found or access denied");
    error.statusCode = 404;
    throw error;
  }
  if (user.role === roles.EMPLOYEE && task.assignedTo !== user.id) {
    const error = new Error("Task not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function canManageTask(user) {
  return user.role === roles.ADMIN || user.role === roles.MANAGER;
}

function assertTransition(current, next) {
  if (current === next) return;
  if (!(transitions[current] ?? []).includes(next)) {
    const error = new Error(`Invalid task status transition from ${current} to ${next}`);
    error.statusCode = 409;
    throw error;
  }
}

export class TaskService {
  constructor(repository) {
    this.repository = repository;
  }

  async listTasks(user, filters = {}) {
    return { tasks: await this.repository.listTasks(taskWhere(user, filters)) };
  }

  async listMyTasks(user, filters = {}) {
    return { tasks: await this.repository.listTasks(taskWhere(user, filters, true)) };
  }

  async getTask(user, taskId) {
    const task = await this.repository.findTaskById(taskId);
    assertTaskAccess(user, task);
    return { task };
  }

  async validateAssignment(user, clientId, assignedTo) {
    if (!assignedTo) return null;
    const assignee = await this.repository.findUserById(assignedTo);
    const isWorker = assignee && [roles.MANAGER, roles.EMPLOYEE].includes(assignee.role.name);
    const assignedToClient = assignee?.assignments.some((assignment) => assignment.clientId === clientId);
    if (!isWorker || !assignee.isActive || assignee.agencyId !== user.agencyId || !assignedToClient) {
      const error = new Error("Assignee must be an active manager or employee assigned to this client");
      error.statusCode = 422;
      throw error;
    }
    return assignee;
  }

  async validateWebsite(clientId, websiteId) {
    if (!websiteId) return;
    const website = await this.repository.findWebsiteById(websiteId);
    if (!website || website.clientId !== clientId) {
      const error = new Error("Website must belong to the selected client");
      error.statusCode = 422;
      throw error;
    }
  }

  async createTask(user, input) {
    const client = await this.repository.findClientById(input.clientId);
    assertClientAccess(user, client);
    await this.validateWebsite(input.clientId, input.websiteId);
    const assignee = await this.validateAssignment(user, input.clientId, input.assignedTo);
    const task = await this.repository.createTask({ ...input, createdBy: user.id });
    await this.recordActivity(user, task.id, "task.created", { clientId: task.clientId, assignedTo: task.assignedTo });
    if (assignee) await this.notifyAssignment(task, assignee.id);
    await this.syncDeadlineAlert(task);
    return { task };
  }

  async updateTask(user, taskId, input) {
    const existing = await this.repository.findTaskById(taskId);
    assertTaskAccess(user, existing);
    if (!canManageTask(user)) {
      const keys = Object.keys(input);
      if (keys.some((key) => key !== "status")) {
        const error = new Error("Employees can only update task status");
        error.statusCode = 403;
        throw error;
      }
    }
    if (input.status) assertTransition(existing.status, input.status);
    const clientId = input.clientId ?? existing.clientId;
    if (input.clientId && input.clientId !== existing.clientId) {
      const client = await this.repository.findClientById(input.clientId);
      assertClientAccess(user, client);
    }
    const websiteId = Object.hasOwn(input, "websiteId") ? input.websiteId : existing.websiteId;
    await this.validateWebsite(clientId, websiteId);
    if (Object.hasOwn(input, "assignedTo") || input.clientId) {
      await this.validateAssignment(user, clientId, Object.hasOwn(input, "assignedTo") ? input.assignedTo : existing.assignedTo);
    }
    const task = await this.repository.updateTask(taskId, input);
    await this.recordActivity(user, task.id, "task.updated", input);
    if (input.assignedTo && input.assignedTo !== existing.assignedTo) await this.notifyAssignment(task, input.assignedTo);
    await this.syncDeadlineAlert(task);
    return { task };
  }

  async deleteTask(user, taskId) {
    const task = await this.repository.findTaskById(taskId);
    assertTaskAccess(user, task);
    if (!canManageTask(user)) {
      const error = new Error("Only managers and admins can delete tasks");
      error.statusCode = 403;
      throw error;
    }
    await this.syncDeadlineAlert({ ...task, status: "cancelled" });
    await this.repository.deleteTask(taskId);
    await this.recordActivity(user, taskId, "task.deleted", { title: task.title });
    return { deleted: true };
  }

  async addComment(user, taskId, input) {
    const task = await this.repository.findTaskById(taskId);
    assertTaskAccess(user, task);
    const comment = await this.repository.createComment(taskId, { authorId: user.id, comment: input.comment, isInternal: true });
    await this.recordActivity(user, taskId, "task.comment_added", { commentId: comment.id });
    return { comment };
  }

  async addAttachment(user, taskId, input) {
    const task = await this.repository.findTaskById(taskId);
    assertTaskAccess(user, task);
    const attachment = await this.repository.createAttachment(taskId, { fileUrl: input.fileUrl, uploadedBy: user.id });
    await this.recordActivity(user, taskId, "task.attachment_added", { attachmentId: attachment.id, fileUrl: attachment.fileUrl });
    return { attachment };
  }

  async getWorkload(user) {
    const workers = await this.repository.listWorkers(user.agencyId);
    const visibleWorkers = user.role === roles.ADMIN
      ? workers
      : workers.filter((worker) => worker.assignments.some((assignment) => user.assignedClientIds.includes(assignment.clientId)));
    const tasks = await this.repository.listTasks(taskWhere(user));
    return {
      workload: visibleWorkers.map((worker) => {
        const assigned = tasks.filter((task) => task.assignedTo === worker.id);
        return {
          user: { id: worker.id, fullName: worker.fullName, email: worker.email, role: worker.role.name },
          total: assigned.length,
          todo: assigned.filter((task) => task.status === "todo").length,
          inProgress: assigned.filter((task) => task.status === "in_progress").length,
          blocked: assigned.filter((task) => task.status === "blocked").length,
          overdue: assigned.filter((task) => task.deadline && task.status !== "done" && new Date(task.deadline) < new Date()).length,
        };
      }),
      unassigned: tasks.filter((task) => !task.assignedTo).length,
    };
  }

  async listNotifications(user) {
    return { notifications: await this.repository.listNotifications(user.id) };
  }

  async markNotificationRead(user, notificationId) {
    const notification = await this.repository.findNotification(notificationId);
    if (!notification || notification.userId !== user.id) {
      const error = new Error("Notification not found or access denied");
      error.statusCode = 404;
      throw error;
    }
    return { notification: await this.repository.markNotificationRead(notificationId) };
  }

  async listAlerts(user, filters = {}) {
    const where = user.role === roles.ADMIN
      ? { agencyId: user.agencyId }
      : { agencyId: user.agencyId, clientId: { in: user.assignedClientIds } };
    if (filters.status) where.status = filters.status;
    return { alerts: await this.repository.listAlerts(where) };
  }

  async resolveAlert(user, alertId) {
    const alert = await this.repository.findAlert(alertId);
    assertClientAccess(user, alert?.client);
    const resolved = await this.repository.resolveAlert(alertId);
    await this.recordActivity(user, alertId, "alert.resolved", { alertType: alert.alertType });
    return { alert: resolved };
  }

  async notifyAssignment(task, userId) {
    await this.repository.createNotification({ userId, message: `Task assigned: ${task.title}`, link: `/tasks?task=${task.id}` });
  }

  async syncDeadlineAlert(task) {
    const existing = await this.repository.findOpenTaskAlert(task.id);
    if (task.status === "done" || task.status === "cancelled" || !task.deadline) {
      if (existing) await this.repository.resolveAlert(existing.id);
      return;
    }
    const deadline = new Date(task.deadline);
    const threshold = Date.now() + 48 * 60 * 60 * 1000;
    if (deadline.getTime() > threshold) {
      if (existing) await this.repository.resolveAlert(existing.id);
      return;
    }
    if (existing) return;
    await this.repository.createAlert({
      agencyId: task.client.agencyId,
      clientId: task.clientId,
      websiteId: task.websiteId,
      alertType: "task_deadline",
      severity: deadline < new Date() ? "high" : "medium",
      title: deadline < new Date() ? `Overdue task: ${task.title}` : `Task deadline approaching: ${task.title}`,
      message: `Deadline: ${deadline.toISOString()}`,
      entityType: "task",
      entityId: task.id,
    });
  }

  recordActivity(user, entityId, action, metadata) {
    return this.repository.createActivity({
      actorId: user.id,
      entityType: "task",
      entityId,
      action,
      metadata: JSON.parse(JSON.stringify(metadata)),
    });
  }
}
