import { toClientSafeRecord } from "../../shared/clientSafeData.js";
import { roles } from "../../shared/permissions.js";
import { canAccessClient, scopedClientWhere } from "../../shared/tenantScope.js";

function assertClientAccess(user, client) {
  if (!client || client.agencyId !== user.agencyId || !canAccessClient(user, client.id)) {
    const error = new Error("Client not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function clientHealth(client) {
  const activeWebsites = client.websites?.filter((website) => website.status === "active").length ?? 0;
  const assignmentCount = client.assignments?.length ?? 0;
  return Math.min(100, 55 + activeWebsites * 15 + assignmentCount * 10);
}

function serializeClient(client, role) {
  const safe = toClientSafeRecord({ ...client, healthScore: clientHealth(client) }, role);
  if (role === roles.CLIENT) {
    delete safe.notes;
    delete safe.assignments;
  }
  return safe;
}

export class ClientService {
  constructor(repository) {
    this.repository = repository;
  }

  async listClients(user) {
    const clients = await this.repository.listClients(scopedClientWhere(user));
    return { clients: clients.map((client) => serializeClient(client, user.role)) };
  }

  async getClient(user, clientId) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    return { client: serializeClient(client, user.role) };
  }

  async createClient(user, input) {
    const client = await this.repository.createClient({ ...input, agencyId: user.agencyId });
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: client.id, action: "client.created", metadata: { companyName: client.companyName } });
    return { client: serializeClient(client, user.role) };
  }

  async updateClient(user, clientId, input) {
    const existing = await this.repository.findClientById(clientId);
    assertClientAccess(user, existing);
    const client = await this.repository.updateClient(clientId, input);
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: client.id, action: "client.updated", metadata: input });
    return { client: serializeClient(client, user.role) };
  }

  async deleteClient(user, clientId) {
    const existing = await this.repository.findClientById(clientId);
    assertClientAccess(user, existing);
    await this.repository.deleteClient(clientId);
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: clientId, action: "client.deleted", metadata: {} });
    return { deleted: true };
  }

  async addContact(user, clientId, input) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    const contact = await this.repository.createContact(clientId, input);
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: clientId, action: "client.contact_added", metadata: { contactId: contact.id } });
    return { contact };
  }

  async addNote(user, clientId, note) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    const saved = await this.repository.createNote(clientId, user.id, note);
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: clientId, action: "client.note_added", metadata: { noteId: saved.id } });
    return { note: saved };
  }

  async assignUser(user, clientId, userId) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    const assignee = await this.repository.findUserInAgency(userId, user.agencyId);
    if (!assignee || ![roles.MANAGER, roles.EMPLOYEE].includes(assignee.role.name)) {
      const error = new Error("Only agency managers and employees can be assigned");
      error.statusCode = 422;
      throw error;
    }
    const assignment = await this.repository.assignUser(clientId, userId);
    await this.repository.createActivity({ actorId: user.id, entityType: "client", entityId: clientId, action: "client.assigned", metadata: { userId } });
    return { assignment };
  }
}
