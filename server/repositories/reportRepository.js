import { prisma } from "../db/prisma.js";

const reportInclude = { client: { select: { id: true, agencyId: true, companyName: true, status: true } } };

export class PrismaReportRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findClientById(id) {
    return this.client.client.findUnique({ where: { id } });
  }

  getClientReportData(clientId, periodStart, periodEnd) {
    return this.client.client.findUnique({
      where: { id: clientId },
      include: {
        websites: {
          include: {
            pageMetrics: { where: { recordedAt: { gte: periodStart, lte: periodEnd } }, orderBy: { recordedAt: "asc" } },
            keywords: { include: { rankings: { where: { recordedAt: { gte: periodStart, lte: periodEnd } }, orderBy: { recordedAt: "asc" } } } },
            audits: { where: { runAt: { gte: periodStart, lte: periodEnd } }, include: { issues: true }, orderBy: { runAt: "desc" } },
            backlinks: { where: { discoveredAt: { gte: periodStart, lte: periodEnd } } },
          },
        },
        tasks: { orderBy: { createdAt: "desc" } },
        contentBriefs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
  }

  listReports(where) {
    return this.client.report.findMany({ where, include: reportInclude, orderBy: { createdAt: "desc" } });
  }

  findReportById(id) {
    return this.client.report.findUnique({ where: { id }, include: reportInclude });
  }

  createReport(data) {
    return this.client.report.create({ data, include: reportInclude });
  }

  updateReport(id, data) {
    return this.client.report.update({ where: { id }, data, include: reportInclude });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}
