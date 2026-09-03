import { roles } from "../../shared/permissions.js";
import { canAccessClient } from "../../shared/tenantScope.js";

function assertWebsiteAccess(user, website) {
  if (!website || website.client.agencyId !== user.agencyId || !canAccessClient(user, website.clientId)) {
    const error = new Error("Website not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function latestByDate(items, dateKey) {
  return [...items].sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0] ?? null;
}

function aggregateByDate(items, dateKey, mapper) {
  const grouped = new Map();
  items.forEach((item) => {
    const date = new Date(item[dateKey]).toISOString().slice(0, 10);
    const current = grouped.get(date) ?? {};
    grouped.set(date, mapper(current, item));
  });
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value }));
}

function latestRank(keyword) {
  return [...(keyword.rankings ?? [])].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)).at(-1) ?? null;
}

function previousRank(keyword) {
  return [...(keyword.rankings ?? [])].sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)).at(-2) ?? null;
}

function keywordMovement(keywords) {
  const movements = keywords.map((keyword) => {
    const latest = latestRank(keyword)?.rankPosition ?? null;
    const previous = previousRank(keyword)?.rankPosition ?? null;
    return { latest, previous };
  });

  return {
    improved: movements.filter((item) => item.latest && item.previous && item.latest < item.previous).length,
    declined: movements.filter((item) => item.latest && item.previous && item.latest > item.previous).length,
    unchanged: movements.filter((item) => !item.latest || !item.previous || item.latest === item.previous).length,
    top3: movements.filter((item) => item.latest && item.latest <= 3).length,
    top10: movements.filter((item) => item.latest && item.latest <= 10).length,
    top100: movements.filter((item) => item.latest && item.latest <= 100).length,
  };
}

function keywordDistribution(keywords) {
  const latest = keywords.map((keyword) => latestRank(keyword)?.rankPosition).filter(Boolean);
  return [
    { bucket: "Top 3", count: latest.filter((rank) => rank <= 3).length },
    { bucket: "4-10", count: latest.filter((rank) => rank > 3 && rank <= 10).length },
    { bucket: "11-20", count: latest.filter((rank) => rank > 10 && rank <= 20).length },
    { bucket: "21-50", count: latest.filter((rank) => rank > 20 && rank <= 50).length },
    { bucket: "51-100", count: latest.filter((rank) => rank > 50 && rank <= 100).length },
  ];
}

function visibilityScoreFromRanks(ranks) {
  return ranks.reduce((total, rank) => total + Math.max(0, 101 - rank), 0);
}

function buildShareOfVoice(website) {
  const clientScore = visibilityScoreFromRanks(
    website.keywords.map((keyword) => latestRank(keyword)?.rankPosition).filter(Boolean),
  );
  const competitorScores = (website.competitors ?? []).map((competitor) => ({
    name: competitor.name ?? competitor.domain,
    domain: competitor.domain,
    score: visibilityScoreFromRanks((competitor.keywords ?? []).map((keyword) => keyword.rankPosition).filter(Boolean)),
  }));
  const entries = [{ name: website.domain, domain: website.domain, score: clientScore }, ...competitorScores];
  const total = entries.reduce((sum, entry) => sum + entry.score, 0) || 1;
  return entries.map((entry) => ({ ...entry, share: Math.round((entry.score / total) * 1000) / 10 }));
}

function buildFreshness(website) {
  const dates = [
    ...website.pageMetrics.map((metric) => metric.recordedAt),
    ...website.keywords.flatMap((keyword) => keyword.rankings.map((ranking) => ranking.recordedAt)),
    ...website.audits.map((audit) => audit.runAt),
    ...website.backlinks.map((backlink) => backlink.discoveredAt).filter(Boolean),
  ].map((date) => new Date(date));
  const latest = dates.sort((a, b) => b - a)[0] ?? null;
  return {
    mode: website.isMock ? "mock" : "live",
    lastUpdatedAt: latest?.toISOString() ?? null,
    label: website.isMock ? "Mock data" : "Live data",
  };
}

export class SeoDashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  async getWebsiteDashboard(user, websiteId) {
    const website = await this.repository.findWebsiteDashboard(websiteId);
    assertWebsiteAccess(user, website);

    const latestMetric = latestByDate(website.pageMetrics, "recordedAt") ?? {};
    const latestAudit = latestByDate(website.audits, "runAt") ?? { issues: [] };
    const movement = keywordMovement(website.keywords);
    const openTasks = website.tasks.filter((task) => task.status !== "done");
    const overdueTasks = openTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date());
    const issueCount = latestAudit.issues?.filter((issue) => !issue.resolved).length ?? 0;
    const criticalIssues = latestAudit.issues?.filter((issue) => !issue.resolved && ["critical", "high"].includes(issue.severity)).length ?? 0;
    const safeForClient = user.role === roles.CLIENT;

    const dashboard = {
      website: { id: website.id, domain: website.domain, clientId: website.clientId },
      client: { id: website.client.id, companyName: website.client.companyName },
      freshness: buildFreshness(website),
      kpis: {
        organicTraffic: latestMetric.organicSessions ?? 0,
        clicks: latestMetric.clicks ?? 0,
        impressions: latestMetric.impressions ?? 0,
        ctr: Number(latestMetric.ctr ?? 0),
        averagePosition: Number(latestMetric.avgPosition ?? 0),
        seoScore: website.seoScore ?? latestAudit.overallScore ?? 0,
        rankingMovement: movement,
        auditHealth: { openIssues: issueCount, criticalIssues, score: latestAudit.overallScore ?? website.seoScore ?? 0 },
        backlinks: website.backlinks.length,
        tasks: { open: openTasks.length, overdue: overdueTasks.length, completed: website.tasks.filter((task) => task.status === "done").length },
      },
      trends: {
        traffic: aggregateByDate(website.pageMetrics, "recordedAt", (current, metric) => ({
          clicks: (current.clicks ?? 0) + (metric.clicks ?? 0),
          impressions: (current.impressions ?? 0) + (metric.impressions ?? 0),
          organicTraffic: (current.organicTraffic ?? 0) + (metric.organicSessions ?? 0),
        })),
        ranking: aggregateByDate(
          website.keywords.flatMap((keyword) => keyword.rankings),
          "recordedAt",
          (current, ranking) => ({ total: (current.total ?? 0) + ranking.rankPosition, count: (current.count ?? 0) + 1 }),
        ).map((row) => ({ date: row.date, averagePosition: Math.round((row.total / row.count) * 10) / 10 })),
        distribution: keywordDistribution(website.keywords),
      },
      topPages: website.pageMetrics
        .filter((metric) => metric.url)
        .sort((a, b) => (b.organicSessions ?? b.clicks ?? 0) - (a.organicSessions ?? a.clicks ?? 0))
        .slice(0, 5)
        .map((metric) => ({ url: metric.url, clicks: metric.clicks ?? 0, impressions: metric.impressions ?? 0, organicTraffic: metric.organicSessions ?? 0 })),
      shareOfVoice: buildShareOfVoice(website),
      audience: safeForClient ? "client" : "internal",
    };

    if (!safeForClient) {
      dashboard.operations = {
        openTasks,
        latestAudit: { id: latestAudit.id, runAt: latestAudit.runAt, issueCount, criticalIssues },
      };
    }

    return dashboard;
  }
}
