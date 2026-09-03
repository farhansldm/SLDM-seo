import { canAccessClient } from "../../shared/tenantScope.js";

function assertClientAccess(user, client) {
  if (!client || client.agencyId !== user.agencyId || !canAccessClient(user, client.id)) {
    const error = new Error("Client not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function assertWebsiteAccess(user, website) {
  if (!website || website.client.agencyId !== user.agencyId || !canAccessClient(user, website.clientId)) {
    const error = new Error("Website not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function workspaceTabs(websiteId) {
  return ["overview", "keywords", "audits", "competitors", "backlinks", "content", "tasks", "reports"].map((tab) => ({ tab, path: `/websites/${websiteId}/${tab}` }));
}

export class WebsiteService {
  constructor(repository) {
    this.repository = repository;
  }

  async listWebsites(user, clientId) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    const websites = await this.repository.listWebsites({ clientId });
    return { websites: websites.map((website) => ({ ...website, tabs: workspaceTabs(website.id) })) };
  }

  async createWebsite(user, clientId, input) {
    const client = await this.repository.findClientById(clientId);
    assertClientAccess(user, client);
    const website = await this.repository.createWebsite({ ...input, clientId });
    await this.repository.createActivity({ actorId: user.id, entityType: "website", entityId: website.id, action: "website.created", metadata: { domain: website.domain } });
    return { website: { ...website, tabs: workspaceTabs(website.id) } };
  }

  async updateWebsite(user, websiteId, input) {
    const existing = await this.repository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, existing);
    const website = await this.repository.updateWebsite(websiteId, input);
    await this.repository.createActivity({ actorId: user.id, entityType: "website", entityId: website.id, action: "website.updated", metadata: input });
    return { website: { ...website, tabs: workspaceTabs(website.id) } };
  }

  async deleteWebsite(user, websiteId) {
    const existing = await this.repository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, existing);
    await this.repository.deleteWebsite(websiteId);
    await this.repository.createActivity({ actorId: user.id, entityType: "website", entityId: websiteId, action: "website.deleted", metadata: {} });
    return { deleted: true };
  }

  async createCompetitor(user, websiteId, input) {
    const website = await this.repository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const competitor = await this.repository.createCompetitor({ ...input, websiteId, clientId: website.clientId, agencyId: user.agencyId });
    await this.repository.createCompetitorBacklink(competitor.id, { sourceUrl: `https://${input.domain}/resources`, targetUrl: `https://${website.domain}/`, domainAuthority: 42, anchorText: input.name ?? input.domain, isDofollow: true, source: "mock" });
    await this.repository.createActivity({ actorId: user.id, entityType: "competitor", entityId: competitor.id, action: "competitor.created", metadata: { domain: competitor.domain } });
    return { competitor };
  }

  async updateCompetitor(user, competitorId, input) {
    const existing = await this.repository.findCompetitorById(competitorId);
    assertWebsiteAccess(user, existing?.website);
    const competitor = await this.repository.updateCompetitor(competitorId, input);
    return { competitor };
  }

  async deleteCompetitor(user, competitorId) {
    const existing = await this.repository.findCompetitorById(competitorId);
    assertWebsiteAccess(user, existing?.website);
    await this.repository.deleteCompetitor(competitorId);
    return { deleted: true };
  }
}
