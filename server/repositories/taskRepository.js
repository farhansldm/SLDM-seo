import { prisma } from "../db/prisma.js";

const taskInclude = {
  client: { select: { id: true, agencyId: true, companyName: true } },
  website: { select: { id: true, domain: true } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  },
  attachments: { orderBy: { uploadedAt: "desc" } },
};

export class PrismaTaskRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  listTasks(where) {
    return this.client.task.findMany({ where, include: taskInclude, orderBy: [{ deadline: "asc" }, { createdAt: "desc" }] });
  }

  findTaskById(id) {
    return this.client.task.findUnique({ where: { id }, include: taskInclude });
  }

  findClientById(id) {
    return this.client.client.findUnique({ where: { id } });
  }

  findWebsiteById(id) {
    return this.client.website.findUnique({ where: { id }, include: { client: true } });
  }

  findUserById(id) {
    return this.client.user.findUnique({ where: { id }, include: { role: true, assignments: true } });
  }

  listWorkers(agencyId) {
    return this.client.user.findMany({
      where: { agencyId, isActive: true, role: { name: { in: ["manager", "employee"] } } },
      include: { role: true, assignments: true },
      orderBy: { fullName: "asc" },
    });
  }

  createTask(data) {
    return this.client.task.create({ data, include: taskInclude });
  }

  updateTask(id, data) {
    return this.client.task.update({ where: { id }, data, include: taskInclude });
  }

  deleteTask(id) {
    return this.client.task.delete({ where: { id } });
  }

  createComment(taskId, data) {
    return this.client.taskComment.create({
      data: { ...data, taskId },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
  }

  createAttachment(taskId, data) {
    return this.client.taskAttachment.create({ data: { ...data, taskId } });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }

  createNotification(data) {
    return this.client.notification.create({ data });
  }

  listNotifications(userId) {
    return this.client.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  findNotification(id) {
    return this.client.notification.findUnique({ where: { id } });
  }

  markNotificationRead(id) {
    return this.client.notification.update({ where: { id }, data: { isRead: true } });
  }

  listAlerts(where) {
    return this.client.alert.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  }

  findAlert(id) {
    return this.client.alert.findUnique({ where: { id }, include: { client: true } });
  }

  findOpenTaskAlert(taskId) {
    return this.client.alert.findFirst({ where: { entityType: "task", entityId: taskId, alertType: "task_deadline", status: "open" } });
  }

  createAlert(data) {
    return this.client.alert.create({ data });
  }

  resolveAlert(id) {
    return this.client.alert.update({ where: { id }, data: { status: "resolved", resolvedAt: new Date() } });
  }
}
