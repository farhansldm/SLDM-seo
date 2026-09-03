import { prisma } from "../db/prisma.js";

export class PrismaAuditRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findWebsiteById(websiteId) {
    return this.client.website.findUnique({ where: { id: websiteId }, include: { client: true } });
  }

  listCrawlRuns(websiteId) {
    return this.client.crawlRun.findMany({
      where: { websiteId },
      orderBy: { startedAt: "desc" },
      include: { crawledUrls: { include: { checks: true } } },
    });
  }

  findCrawlRun(crawlRunId) {
    return this.client.crawlRun.findUnique({
      where: { id: crawlRunId },
      include: { website: { include: { client: true } }, crawledUrls: { include: { checks: true } } },
    });
  }

  findTechnicalCheck(checkId) {
    return this.client.technicalCheck.findUnique({
      where: { id: checkId },
      include: { crawledUrl: { include: { crawlRun: { include: { website: { include: { client: true } } } } } } },
    });
  }

  createCrawlRun({ agencyId, clientId, websiteId, source, triggeredBy, totalUrls, crawledUrls }) {
    const now = new Date();
    return this.client.crawlRun.create({
      data: {
        agencyId,
        clientId,
        websiteId,
        source,
        triggeredBy,
        totalUrls,
        status: "completed",
        startedAt: now,
        completedAt: now,
        crawledUrls: {
          create: crawledUrls.map((url) => ({
            websiteId,
            url: url.url,
            statusCode: url.statusCode,
            title: url.title,
            metaDescription: url.metaDescription,
            h1: url.h1,
            canonicalUrl: url.canonicalUrl,
            isIndexable: url.isIndexable,
            wordCount: url.wordCount,
            loadTimeMs: url.loadTimeMs,
            depth: url.depth,
            checks: { create: url.checks },
          })),
        },
      },
      include: { crawledUrls: { include: { checks: true } } },
    });
  }

  createSeoAudit({ websiteId, overallScore, triggeredBy, issues }) {
    return this.client.seoAudit.create({
      data: {
        websiteId,
        overallScore,
        triggeredBy,
        issues: { create: issues },
      },
      include: { issues: true },
    });
  }

  createTaskFromCheck({ clientId, websiteId, createdBy, title, priority }) {
    return this.client.task.create({
      data: {
        clientId,
        websiteId,
        createdBy,
        title,
        category: "technical_seo",
        priority,
        status: "todo",
      },
    });
  }
}
