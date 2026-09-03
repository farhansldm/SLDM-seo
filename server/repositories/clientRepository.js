import { prisma } from "../db/prisma.js";

const clientInclude = {
  contacts: true,
  notes: true,
  assignments: { include: { user: { include: { role: true } } } },
  websites: true,
};

export class PrismaClientRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  listClients(where) {
    return this.client.client.findMany({ where, include: clientInclude, orderBy: { companyName: "asc" } });
  }

  findClientById(id) {
    return this.client.client.findUnique({ where: { id }, include: clientInclude });
  }

  createClient(data) {
    return this.client.client.create({ data, include: clientInclude });
  }

  updateClient(id, data) {
    return this.client.client.update({ where: { id }, data, include: clientInclude });
  }

  deleteClient(id) {
    return this.client.client.delete({ where: { id } });
  }

  createContact(clientId, data) {
    return this.client.clientContact.create({ data: { ...data, clientId } });
  }

  createNote(clientId, authorId, note) {
    return this.client.clientNote.create({ data: { clientId, authorId, note } });
  }

  findUserInAgency(userId, agencyId) {
    return this.client.user.findFirst({ where: { id: userId, agencyId }, include: { role: true } });
  }

  assignUser(clientId, userId) {
    return this.client.clientAssignment.create({ data: { clientId, userId } });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}
