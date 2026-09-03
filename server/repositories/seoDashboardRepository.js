import { prisma } from "../db/prisma.js";

export class PrismaSeoDashboardRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findWebsiteDashboard(websiteId) {
    return this.client.website.findUnique({
      where: { id: websiteId },
      include: {
        client: true,
        backlinks: true,
        tasks: true,
        pageMetrics: { orderBy: { recordedAt: "asc" } },
        audits: { orderBy: { runAt: "desc" }, include: { issues: true } },
        keywords: { include: { rankings: { orderBy: { recordedAt: "asc" } } } },
        competitors: { include: { keywords: true } },
      },
    });
  }
}
