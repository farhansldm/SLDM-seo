import { prisma } from "../db/prisma.js";

const websiteInclude = { client: true, competitors: { include: { backlinks: true } } };

export class PrismaWebsiteRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findClientById(clientId) {
    return this.client.client.findUnique({ where: { id: clientId } });
  }

  findWebsiteById(id) {
    return this.client.website.findUnique({ where: { id }, include: websiteInclude });
  }

  listWebsites(where) {
    return this.client.website.findMany({ where, include: websiteInclude, orderBy: { createdAt: "desc" } });
  }

  createWebsite(data) {
    return this.client.website.create({ data, include: websiteInclude });
  }

  updateWebsite(id, data) {
    return this.client.website.update({ where: { id }, data, include: websiteInclude });
  }

  deleteWebsite(id) {
    return this.client.website.delete({ where: { id } });
  }

  createCompetitor(data) {
    return this.client.competitor.create({ data, include: { backlinks: true } });
  }

  updateCompetitor(id, data) {
    return this.client.competitor.update({ where: { id }, data, include: { backlinks: true } });
  }

  deleteCompetitor(id) {
    return this.client.competitor.delete({ where: { id } });
  }

  findCompetitorById(id) {
    return this.client.competitor.findUnique({ where: { id }, include: { website: { include: { client: true } }, backlinks: true } });
  }

  createCompetitorBacklink(competitorId, data) {
    return this.client.competitorBacklink.create({ data: { ...data, competitorId } });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}
