import { canAccessClient } from "../../shared/tenantScope.js";

const severityWeights = { critical: 18, high: 12, medium: 7, low: 3 };

const mockPages = [
  {
    path: "/",
    statusCode: 200,
    title: "Home",
    metaDescription: "SEO services for growth-focused companies.",
    h1: "SEO Growth Services",
    canonicalUrl: "/",
    isIndexable: true,
    wordCount: 820,
    loadTimeMs: 1150,
    depth: 0,
  },
  {
    path: "/services",
    statusCode: 200,
    title: "Services",
    metaDescription: "",
    h1: "SEO Services",
    canonicalUrl: "/services",
    isIndexable: true,
    wordCount: 260,
    loadTimeMs: 2850,
    depth: 1,
  },
  {
    path: "/blog/old-post",
    statusCode: 404,
    title: "Old SEO Post",
    metaDescription: "Legacy post.",
    h1: "Old SEO Post",
    canonicalUrl: "/blog/old-post",
    isIndexable: false,
    wordCount: 120,
    loadTimeMs: 920,
    depth: 2,
  },
  {
    path: "/pricing",
    statusCode: 301,
    title: "Services",
    metaDescription: "SEO pricing and plans.",
    h1: "Pricing",
    canonicalUrl: "/plans",
    isIndexable: true,
    wordCount: 430,
    loadTimeMs: 1600,
    depth: 1,
  },
  {
    path: "/case-study",
    statusCode: 200,
    title: "",
    metaDescription: "",
    h1: "Case Study | Results | Growth",
    canonicalUrl: "/case-study?ref=nav",
    isIndexable: true,
    wordCount: 190,
    loadTimeMs: 3600,
    depth: 2,
  },
];

function fullUrl(domain, path) {
  return `https://${domain}${path}`;
}

function issue(checkType, severity, description, recommendation) {
  return { checkType, severity, description, recommendation, status: "open" };
}

function checksForPage(page, duplicateTitles, duplicateMetas) {
  const checks = [];
  if (page.statusCode >= 400) checks.push(issue("broken_link", "critical", "URL returns an error status.", "Fix the destination URL or redirect it to a live equivalent."));
  if (page.statusCode >= 300 && page.statusCode < 400) checks.push(issue("redirect_chain", "medium", "URL redirects before resolving.", "Update internal links to the final canonical URL."));
  if (!page.title) checks.push(issue("missing_title", "high", "Page is missing a title tag.", "Write a unique title with the primary keyword."));
  if (duplicateTitles.has(page.title) && page.title) checks.push(issue("duplicate_title", "medium", "Page title is duplicated on multiple URLs.", "Make the title unique for this page intent."));
  if (!page.metaDescription) checks.push(issue("missing_meta_description", "medium", "Page is missing a meta description.", "Add a concise search-result description."));
  if (duplicateMetas.has(page.metaDescription) && page.metaDescription) checks.push(issue("duplicate_meta_description", "low", "Meta description is duplicated.", "Write a page-specific description."));
  if (!page.h1) checks.push(issue("missing_h1", "medium", "Page is missing an H1.", "Add one clear H1 that reflects page intent."));
  if ((page.h1?.match(/\|/g) ?? []).length > 0) checks.push(issue("multiple_h1", "medium", "Page appears to contain multiple H1-style headings.", "Keep one primary H1 and demote secondary headings."));
  if (page.wordCount < 300) checks.push(issue("thin_content", "medium", "Page has low body content.", "Expand useful, intent-matched content."));
  if (page.loadTimeMs > 2500) checks.push(issue("slow_page", "high", "Page load time is above target.", "Optimize assets, caching, and render-blocking resources."));
  if (page.isIndexable === false) checks.push(issue("noindex", "high", "Page is not indexable.", "Confirm noindex is intentional or remove it."));
  if (page.canonicalUrl?.includes("?")) checks.push(issue("canonical_problem", "medium", "Canonical URL contains tracking/query parameters.", "Point canonical to the clean preferred URL."));
  if (page.path === "/case-study") checks.push(issue("image_alt_issue", "low", "Important images appear to be missing alt text.", "Add descriptive alt text to content images."));
  if (page.path === "/services") checks.push(issue("sitemap_gap", "low", "Important URL is missing from sitemap coverage.", "Add the URL to the XML sitemap."));
  if (page.path === "/blog/old-post") checks.push(issue("robots_block", "medium", "Robots rules may block discovery of this URL.", "Review robots.txt rules for this path."));
  return checks;
}

function toSeoIssue(check, url) {
  return {
    issueType: check.checkType,
    severity: check.severity,
    affectedUrl: url,
    description: check.description,
  };
}

function scoreFromChecks(checks) {
  const penalty = checks.reduce((total, check) => total + (severityWeights[check.severity] ?? 4), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function summarizeRun(run) {
  const urls = run.crawledUrls ?? [];
  const checks = urls.flatMap((url) => url.checks ?? []);
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    totalUrls: run.totalUrls,
    source: run.source,
    score: scoreFromChecks(checks),
    checks: {
      total: checks.length,
      critical: checks.filter((check) => check.severity === "critical").length,
      high: checks.filter((check) => check.severity === "high").length,
      medium: checks.filter((check) => check.severity === "medium").length,
      low: checks.filter((check) => check.severity === "low").length,
    },
  };
}

function assertWebsiteAccess(user, website) {
  if (!website || website.client.agencyId !== user.agencyId || !canAccessClient(user, website.clientId)) {
    const error = new Error("Website not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

export class TechnicalAuditService {
  constructor(repository) {
    this.repository = repository;
  }

  buildMockCrawl(domain) {
    const titleCounts = new Map();
    const metaCounts = new Map();
    mockPages.forEach((page) => {
      titleCounts.set(page.title, (titleCounts.get(page.title) ?? 0) + 1);
      metaCounts.set(page.metaDescription, (metaCounts.get(page.metaDescription) ?? 0) + 1);
    });
    const duplicateTitles = new Set([...titleCounts.entries()].filter(([, count]) => count > 1).map(([title]) => title));
    const duplicateMetas = new Set([...metaCounts.entries()].filter(([, count]) => count > 1).map(([meta]) => meta));

    return mockPages.map((page) => {
      const url = fullUrl(domain, page.path);
      return { ...page, url, checks: checksForPage(page, duplicateTitles, duplicateMetas) };
    });
  }

  async runAudit(user, websiteId) {
    const website = await this.repository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const crawledUrls = this.buildMockCrawl(website.domain);
    const allChecks = crawledUrls.flatMap((url) => url.checks.map((check) => ({ ...check, affectedUrl: url.url })));
    const score = scoreFromChecks(allChecks);

    const [crawlRun, seoAudit] = await Promise.all([
      this.repository.createCrawlRun({
        agencyId: website.client.agencyId,
        clientId: website.clientId,
        websiteId,
        source: "mock",
        triggeredBy: user.id,
        totalUrls: crawledUrls.length,
        crawledUrls,
      }),
      this.repository.createSeoAudit({
        websiteId,
        overallScore: score,
        triggeredBy: user.id,
        issues: allChecks.map((check) => toSeoIssue(check, check.affectedUrl)),
      }),
    ]);

    return { crawlRun, seoAudit, summary: summarizeRun(crawlRun), comparison: await this.compareLatest(user, websiteId, crawlRun.id) };
  }

  async listRuns(user, websiteId) {
    const website = await this.repository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const runs = await this.repository.listCrawlRuns(websiteId);
    return { website: { id: website.id, domain: website.domain }, runs: runs.map(summarizeRun) };
  }

  async getRun(user, crawlRunId) {
    const run = await this.repository.findCrawlRun(crawlRunId);
    assertWebsiteAccess(user, run?.website);
    return { run, summary: summarizeRun(run), comparison: await this.compareLatest(user, run.websiteId, run.id) };
  }

  async compareLatest(user, websiteId, currentRunId = null) {
    const runs = await this.repository.listCrawlRuns(websiteId);
    const current = currentRunId ? runs.find((run) => run.id === currentRunId) : runs[0];
    const previous = runs.find((run) => run.id !== current?.id) ?? null;
    if (!current || !previous) return null;
    const currentSummary = summarizeRun(current);
    const previousSummary = summarizeRun(previous);
    return {
      previousRunId: previous.id,
      scoreDelta: currentSummary.score - previousSummary.score,
      issueDelta: currentSummary.checks.total - previousSummary.checks.total,
      criticalDelta: currentSummary.checks.critical - previousSummary.checks.critical,
    };
  }

  async createTaskFromCheck(user, checkId) {
    const check = await this.repository.findTechnicalCheck(checkId);
    const website = check?.crawledUrl?.crawlRun?.website;
    assertWebsiteAccess(user, website);
    const priority = check.severity === "critical" || check.severity === "high" ? "high" : check.severity ?? "medium";
    const task = await this.repository.createTaskFromCheck({
      clientId: website.clientId,
      websiteId: website.id,
      createdBy: user.id,
      title: `${check.checkType}: ${check.description}`,
      priority,
    });
    return { task };
  }
}
