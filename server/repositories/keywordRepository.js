import { prisma } from "../db/prisma.js";

const keywordInclude = {
  group: true,
  rankings: { orderBy: { recordedAt: "asc" } },
};

export class PrismaKeywordRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findWebsiteById(websiteId) {
    return this.client.website.findUnique({ where: { id: websiteId }, include: { client: true } });
  }

  findKeywordById(keywordId) {
    return this.client.keyword.findUnique({ where: { id: keywordId }, include: { website: { include: { client: true } } } });
  }

  listGroups(websiteId) {
    return this.client.keywordGroup.findMany({ where: { websiteId }, orderBy: { name: "asc" } });
  }

  createGroup(websiteId, name) {
    return this.client.keywordGroup.create({ data: { websiteId, name } });
  }

  listKeywords(websiteId, filters = {}) {
    const where = {
      websiteId,
      ...(filters.groupId ? { groupId: filters.groupId } : {}),
      ...(filters.intent ? { intent: filters.intent } : {}),
      ...(filters.device ? { device: filters.device } : {}),
      ...(filters.location ? { location: filters.location } : {}),
      ...(filters.q ? { keyword: { contains: filters.q, mode: "insensitive" } } : {}),
    };

    return this.client.keyword.findMany({ where, include: keywordInclude, orderBy: { keyword: "asc" } });
  }

  createKeyword(websiteId, input) {
    return this.client.keyword.create({
      data: { ...input, websiteId },
      include: keywordInclude,
    });
  }

  updateKeyword(keywordId, input) {
    return this.client.keyword.update({ where: { id: keywordId }, data: input, include: keywordInclude });
  }

  deleteKeyword(keywordId) {
    return this.client.keyword.delete({ where: { id: keywordId } });
  }

  async replaceRankings(keywordId, rankings) {
    await this.client.keywordRanking.deleteMany({ where: { keywordId } });
    if (!rankings.length) return [];
    await this.client.keywordRanking.createMany({ data: rankings.map((ranking) => ({ ...ranking, keywordId })) });
    return this.client.keywordRanking.findMany({ where: { keywordId }, orderBy: { recordedAt: "asc" } });
  }
}
