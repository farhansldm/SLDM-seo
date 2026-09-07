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

  createQueuedCrawlRun({ agencyId, clientId, websiteId, source, triggeredBy }) {
    return this.client.crawlRun.create({
      data: {
        agencyId,
        clientId,
        websiteId,
        source,
        triggeredBy,
        status: "queued",
      },
      include: { crawledUrls: { include: { checks: true } } },
    });
  }

  completeCrawlRun({ crawlRunId, websiteId, overallScore, triggeredBy, crawledUrls, issues }) {
    const now = new Date();
    return this.client.$transaction(async (transaction) => {
      await transaction.crawlRun.update({ where: { id: crawlRunId }, data: { status: "running", startedAt: now } });
      const crawlRun = await transaction.crawlRun.update({
        where: { id: crawlRunId },
        data: {
          status: "completed",
          completedAt: now,
          totalUrls: crawledUrls.length,
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
      const seoAudit = await transaction.seoAudit.create({
        data: { websiteId, overallScore, triggeredBy, issues: { create: issues } },
        include: { issues: true },
      });
      return { crawlRun, seoAudit };
    });
  }

  failCrawlRun(crawlRunId) {
    return this.client.crawlRun.update({
      where: { id: crawlRunId },
      data: { status: "failed", completedAt: new Date() },
    });
  }

  updateTechnicalCheck(checkId, data) {
    return this.client.technicalCheck.update({ where: { id: checkId }, data });
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
