import { roles } from "../../shared/permissions.js";
import { canAccessClient } from "../../shared/tenantScope.js";

function assertClientAccess(user, client) {
  if (!client || client.agencyId !== user.agencyId || !canAccessClient(user, client.id)) {
    const error = new Error("Client not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function assertReportAccess(user, report) {
  assertClientAccess(user, report?.client);
  if (user.role === roles.CLIENT && report.status !== "approved") {
    const error = new Error("Report not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function reportWhere(user) {
  if (user.role === roles.ADMIN) return { client: { agencyId: user.agencyId } };
  if (user.role === roles.CLIENT) return { clientId: user.clientId, status: "approved" };
  return { clientId: { in: user.assignedClientIds } };
}

function round(value, places = 1) {
  const scale = 10 ** places;
  return Math.round(Number(value ?? 0) * scale) / scale;
}

function latestByDate(items, key) {
  return [...items].sort((a, b) => new Date(b[key]) - new Date(a[key]))[0] ?? null;
}

function aggregateTraffic(websites) {
  const dates = new Map();
  websites.flatMap((website) => website.pageMetrics).forEach((metric) => {
    const date = new Date(metric.recordedAt).toISOString().slice(0, 10);
    const current = dates.get(date) ?? { organicTraffic: 0, clicks: 0, impressions: 0, weightedPosition: 0 };
    current.organicTraffic += metric.organicSessions ?? 0;
    current.clicks += metric.clicks ?? 0;
    current.impressions += metric.impressions ?? 0;
    current.weightedPosition += Number(metric.avgPosition ?? 0) * Number(metric.impressions ?? 0);
    dates.set(date, current);
  });
  const trend = [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({
    date,
    organicTraffic: value.organicTraffic,
    clicks: value.clicks,
    impressions: value.impressions,
    ctr: value.impressions ? round(value.clicks / value.impressions, 4) : 0,
    averagePosition: value.impressions ? round(value.weightedPosition / value.impressions) : 0,
  }));
  const totals = trend.reduce((sum, row) => ({
    organicTraffic: sum.organicTraffic + row.organicTraffic,
    clicks: sum.clicks + row.clicks,
    impressions: sum.impressions + row.impressions,
    weightedPosition: sum.weightedPosition + row.averagePosition * row.impressions,
  }), { organicTraffic: 0, clicks: 0, impressions: 0, weightedPosition: 0 });
  return {
    organicTraffic: totals.organicTraffic,
    clicks: totals.clicks,
    impressions: totals.impressions,
    ctr: totals.impressions ? round(totals.clicks / totals.impressions, 4) : 0,
    averagePosition: totals.impressions ? round(totals.weightedPosition / totals.impressions) : 0,
    trend,
  };
}

function aggregateKeywords(websites) {
  const rows = websites.flatMap((website) => website.keywords.map((keyword) => {
    const rankings = [...keyword.rankings].filter((ranking) => ranking.rankPosition != null).sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    const latest = rankings.at(-1)?.rankPosition ?? null;
    const previous = rankings.at(-2)?.rankPosition ?? latest;
    return { keyword: keyword.keyword, website: website.domain, position: latest, change: latest == null ? 0 : previous - latest };
  })).filter((row) => row.position != null);
  return {
    tracked: rows.length,
    improved: rows.filter((row) => row.change > 0).length,
    declined: rows.filter((row) => row.change < 0).length,
    unchanged: rows.filter((row) => row.change === 0).length,
    topKeywords: rows.sort((a, b) => a.position - b.position).slice(0, 15),
  };
}

function aggregateTechnicalHealth(websites) {
  const latestAudits = websites.map((website) => latestByDate(website.audits, "runAt")).filter(Boolean);
  const issues = latestAudits.flatMap((audit) => audit.issues);
  const scores = latestAudits.map((audit) => audit.overallScore).filter((score) => score != null);
  const openIssues = issues.filter((issue) => !issue.resolved);
  return {
    averageScore: scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    openIssues: openIssues.length,
    criticalIssues: openIssues.filter((issue) => ["critical", "high"].includes(issue.severity)).length,
    resolvedIssues: issues.filter((issue) => issue.resolved).length,
    highlights: openIssues
      .filter((issue) => ["critical", "high"].includes(issue.severity))
      .slice(0, 8)
      .map((issue) => `${issue.description ?? issue.issueType} (${issue.affectedUrl ?? "site-wide"})`),
  };
}

export function buildReportSnapshot(client, periodStart, periodEnd) {
  const performance = aggregateTraffic(client.websites);
  const keywords = aggregateKeywords(client.websites);
  const technicalHealth = aggregateTechnicalHealth(client.websites);
  const tasks = client.tasks.filter((task) => new Date(task.createdAt) <= periodEnd);
  const completed = tasks.filter((task) => task.status === "done");
  const open = tasks.filter((task) => !["done", "cancelled"].includes(task.status));
  const recommendations = [
    ...technicalHealth.highlights,
    ...open.filter((task) => ["urgent", "high"].includes(task.priority)).map((task) => `Priority task: ${task.title}`),
    ...client.contentBriefs.filter((brief) => brief.status !== "done").map((brief) => `Content opportunity: ${brief.title ?? brief.targetKeyword}`),
  ].filter(Boolean).slice(0, 10);
  return {
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
    dataMode: client.websites.length && client.websites.every((website) => !website.isMock) ? "live" : "mock",
    websites: client.websites.map((website) => ({ id: website.id, domain: website.domain, seoScore: website.seoScore ?? 0 })),
    performance,
    keywords,
    technicalHealth,
    backlinks: { newLinks: client.websites.reduce((sum, website) => sum + website.backlinks.length, 0) },
    tasks: {
      completed: completed.length,
      open: open.length,
      blocked: open.filter((task) => task.status === "blocked").length,
      completedTitles: completed.slice(0, 12).map((task) => task.title),
      currentPriorities: open.slice(0, 12).map((task) => ({ title: task.title, priority: task.priority, deadline: task.deadline?.toISOString?.() ?? task.deadline ?? null })),
    },
    content: { briefs: client.contentBriefs.length },
    recommendations,
  };
}

function executiveSummary(client, snapshot) {
  return `${client.companyName} recorded ${snapshot.performance.organicTraffic} organic sessions and ${snapshot.performance.clicks} search clicks during the reporting period. ${snapshot.keywords.improved} tracked keywords improved, ${snapshot.tasks.completed} tasks are complete, and the latest technical health score is ${snapshot.technicalHealth.averageScore}.`;
}

export class ReportService {
  constructor(repository, pdfService) {
    this.repository = repository;
    this.pdfService = pdfService;
  }

  async createReport(user, input) {
    const client = await this.repository.getClientReportData(input.clientId, input.periodStart, input.periodEnd);
    assertClientAccess(user, client);
    const reportData = buildReportSnapshot(client, input.periodStart, input.periodEnd);
    const report = await this.repository.createReport({
      clientId: client.id,
      title: input.title ?? `${client.companyName} SEO Performance Report`,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      summary: input.summary ?? executiveSummary(client, reportData),
      reportData,
      status: "draft",
      generatedBy: user.id,
    });
    await this.activity(user, report.id, "report.created", { clientId: client.id, periodStart: input.periodStart, periodEnd: input.periodEnd });
    return { report };
  }

  async listReports(user) {
    return { reports: await this.repository.listReports(reportWhere(user)) };
  }

  async getReport(user, reportId) {
    const report = await this.repository.findReportById(reportId);
    assertReportAccess(user, report);
    return { report };
  }

  async generatePdf(user, reportId) {
    const report = await this.repository.findReportById(reportId);
    assertReportAccess(user, report);
    if (user.role === roles.CLIENT) {
      const error = new Error("Clients cannot regenerate reports");
      error.statusCode = 403;
      throw error;
    }
    const generated = await this.pdfService.generate(report);
    const updated = await this.repository.updateReport(report.id, { pdfUrl: generated.pdfUrl });
    await this.activity(user, report.id, "report.pdf_generated", {});
    return { report: updated };
  }

  async approveReport(user, reportId) {
    const report = await this.repository.findReportById(reportId);
    assertReportAccess(user, report);
    if (report.status === "approved") return { report };
    if (report.status !== "draft") {
      const error = new Error("Only draft reports can be approved");
      error.statusCode = 409;
      throw error;
    }
    const generated = await this.pdfService.generate(report);
    const approved = await this.repository.updateReport(report.id, {
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      pdfUrl: generated.pdfUrl,
    });
    await this.activity(user, report.id, "report.approved", { clientId: report.clientId });
    return { report: approved };
  }

  async getDownload(user, reportId) {
    const report = await this.repository.findReportById(reportId);
    assertReportAccess(user, report);
    if (!report.pdfUrl || !(await this.pdfService.exists(report.id))) {
      const error = new Error("Report PDF has not been generated");
      error.statusCode = 404;
      throw error;
    }
    return { filePath: this.pdfService.filePath(report.id), fileName: `${report.title ?? "seo-report"}.pdf`.replaceAll(/[\\/:*?"<>|]/g, "-") };
  }

  async getPortalDashboard(user) {
    if (user.role !== roles.CLIENT || !user.clientId) {
      const error = new Error("Client portal access required");
      error.statusCode = 403;
      throw error;
    }
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);
    const client = await this.repository.getClientReportData(user.clientId, periodStart, periodEnd);
    assertClientAccess(user, client);
    const snapshot = buildReportSnapshot(client, periodStart, periodEnd);
    const reports = await this.repository.listReports({ clientId: user.clientId, status: "approved" });
    return {
      client: { id: client.id, companyName: client.companyName },
      websites: snapshot.websites,
      performance: snapshot.performance,
      keywordMovement: { improved: snapshot.keywords.improved, declined: snapshot.keywords.declined },
      technicalHealth: snapshot.technicalHealth,
      completedWork: snapshot.tasks.completedTitles,
      currentPriorities: snapshot.tasks.currentPriorities,
      recommendations: snapshot.recommendations,
      approvedReports: reports,
      audience: "client",
    };
  }

  activity(user, entityId, action, metadata) {
    return this.repository.createActivity({
      actorId: user.id,
      entityType: "report",
      entityId,
      action,
      metadata: JSON.parse(JSON.stringify(metadata)),
    });
  }
}
