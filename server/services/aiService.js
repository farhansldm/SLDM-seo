import { roles } from "../../shared/permissions.js";
import { canAccessClient } from "../../shared/tenantScope.js";
import { buildAiPrompt } from "../ai/prompts.js";

function assertClientAccess(user, client) {
  if (!client || client.agencyId !== user.agencyId || !canAccessClient(user, client.id)) {
    const error = new Error("Client not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function requestWhere(user, clientId) {
  if (user.role === roles.ADMIN) {
    return { client: { agencyId: user.agencyId }, ...(clientId ? { clientId } : {}) };
  }
  return { clientId: clientId ?? { in: user.assignedClientIds } };
}

function normalizeContext(client) {
  return {
    client: { id: client.id, companyName: client.companyName, status: client.status },
    websites: client.websites.map((website) => ({
      id: website.id,
      domain: website.domain,
      seoScore: website.seoScore,
      businessCategory: website.businessCategory,
      targetLocations: website.targetLocations,
      keywords: website.keywords.map((keyword) => ({
        keyword: keyword.keyword,
        intent: keyword.intent,
        targetPage: keyword.targetPage,
        searchVolume: keyword.searchVolume,
        difficulty: keyword.difficulty,
        rankings: keyword.rankings.map((ranking) => ({ position: ranking.rankPosition, recordedAt: ranking.recordedAt })),
      })),
      backlinks: website.backlinks.map((link) => ({ sourceUrl: link.sourceUrl, targetUrl: link.targetUrl, domainAuthority: link.domainAuthority, anchorText: link.anchorText })),
      audits: website.audits.map((audit) => ({
        runAt: audit.runAt,
        overallScore: audit.overallScore,
        issues: audit.issues.map((issue) => ({ issueType: issue.issueType, severity: issue.severity, affectedUrl: issue.affectedUrl, description: issue.description })),
      })),
      competitors: website.competitors.map((competitor) => ({
        domain: competitor.domain,
        priority: competitor.priority,
        keywords: competitor.keywords,
        pages: competitor.pages,
        backlinks: competitor.backlinks,
      })),
      recentMetrics: website.pageMetrics,
    })),
    tasks: client.tasks.map((task) => ({ title: task.title, category: task.category, priority: task.priority, status: task.status, deadline: task.deadline })),
    reports: client.reports.map((report) => ({ title: report.title, periodStart: report.periodStart, periodEnd: report.periodEnd, summary: report.summary, status: report.status })),
    contentBriefs: client.contentBriefs.map((brief) => ({ title: brief.title, targetKeyword: brief.targetKeyword, status: brief.status })),
  };
}

function jsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export class AiService {
  constructor(repository, provider, now = Date.now) {
    this.repository = repository;
    this.provider = provider;
    this.now = now;
  }

  async generate(user, input) {
    const client = await this.repository.getResearchContext(input.clientId, input.websiteId);
    assertClientAccess(user, client);
    if (input.websiteId && client.websites.length === 0) {
      const error = new Error("Website not found for this client");
      error.statusCode = 404;
      throw error;
    }

    const context = normalizeContext(client);
    const prompt = buildAiPrompt(input.type, context, input.instructions);
    const startedAt = this.now();
    let request = await this.repository.createRequest({
      userId: user.id,
      clientId: input.clientId,
      websiteId: input.websiteId,
      requestType: input.type,
      provider: this.provider.name,
      model: this.provider.model,
      status: "processing",
      reviewStatus: "pending",
      inputPayload: jsonValue({ instructions: input.instructions || null, context }),
    });

    try {
      const result = await this.provider.generate({ type: input.type, prompt });
      request = await this.repository.updateRequest(request.id, {
        status: "completed",
        outputText: result.text,
        outputPayload: jsonValue({ providerRequestId: result.providerRequestId, usage: result.usage }),
        durationMs: Math.max(0, this.now() - startedAt),
      });
      await this.activity(user, request.id, "ai.generated", { clientId: input.clientId, requestType: input.type });
      return { request };
    } catch (providerError) {
      await this.repository.updateRequest(request.id, {
        status: "failed",
        reviewStatus: "not_applicable",
        errorMessage: String(providerError.message ?? "Provider failure").slice(0, 500),
        durationMs: Math.max(0, this.now() - startedAt),
      });
      const error = new Error("AI provider request failed");
      error.statusCode = 502;
      throw error;
    }
  }

  async list(user, clientId) {
    if (clientId && !canAccessClient(user, clientId)) {
      const error = new Error("Client not found or access denied");
      error.statusCode = 404;
      throw error;
    }
    return { requests: await this.repository.listRequests(requestWhere(user, clientId)) };
  }

  async get(user, id) {
    const request = await this.repository.findRequestById(id);
    assertClientAccess(user, request?.client);
    return { request };
  }

  async review(user, id, reviewStatus) {
    const request = await this.repository.findRequestById(id);
    assertClientAccess(user, request?.client);
    if (![roles.ADMIN, roles.MANAGER].includes(user.role)) {
      const error = new Error("Manager approval is required");
      error.statusCode = 403;
      throw error;
    }
    if (request.status !== "completed") {
      const error = new Error("Only completed AI output can be reviewed");
      error.statusCode = 409;
      throw error;
    }
    const updated = await this.repository.updateRequest(id, { reviewStatus, reviewedBy: user.id, reviewedAt: new Date(this.now()) });
    await this.activity(user, id, `ai.${reviewStatus}`, { clientId: request.clientId });
    return { request: updated };
  }

  activity(user, entityId, action, metadata) {
    return this.repository.createActivity({ actorId: user.id, entityType: "ai_request", entityId, action, metadata });
  }
}
