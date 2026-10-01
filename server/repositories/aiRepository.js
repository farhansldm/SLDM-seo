import { prisma } from "../db/prisma.js";

const requestInclude = {
  client: { select: { id: true, agencyId: true, companyName: true } },
  website: { select: { id: true, clientId: true, domain: true } },
  user: { select: { id: true, fullName: true, email: true } },
};

export class PrismaAiRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  getResearchContext(clientId, websiteId) {
    return this.client.client.findUnique({
      where: { id: clientId },
      include: {
        websites: {
          where: websiteId ? { id: websiteId } : undefined,
          include: {
            keywords: { include: { rankings: { orderBy: { recordedAt: "desc" }, take: 3 } }, take: 100 },
            backlinks: { orderBy: { discoveredAt: "desc" }, take: 50 },
            audits: { orderBy: { runAt: "desc" }, take: 2, include: { issues: { where: { resolved: false }, take: 50 } } },
            competitors: { include: { keywords: { take: 50 }, pages: { take: 25 }, backlinks: { take: 50 } }, take: 10 },
            pageMetrics: { orderBy: { recordedAt: "desc" }, take: 30 },
          },
        },
        tasks: { orderBy: { createdAt: "desc" }, take: 50 },
        reports: { orderBy: { createdAt: "desc" }, take: 5 },
        contentBriefs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  createRequest(data) {
    return this.client.aiRequest.create({ data, include: requestInclude });
  }

  updateRequest(id, data) {
    return this.client.aiRequest.update({ where: { id }, data, include: requestInclude });
  }

  findRequestById(id) {
    return this.client.aiRequest.findUnique({ where: { id }, include: requestInclude });
  }

  listRequests(where) {
    return this.client.aiRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: "desc" }, take: 100 });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}
