import { canAccessClient } from "../../shared/tenantScope.js";

const csvColumns = [
  "keyword",
  "searchVolume",
  "difficulty",
  "cpc",
  "intent",
  "device",
  "location",
  "language",
  "source",
  "groupId",
];

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeKeyword(input) {
  return {
    keyword: String(input.keyword ?? "").trim(),
    searchVolume: normalizeNumber(input.searchVolume),
    difficulty: normalizeNumber(input.difficulty),
    cpc: normalizeNumber(input.cpc),
    intent: input.intent || null,
    device: input.device || "desktop",
    location: input.location || null,
    language: input.language || "en",
    source: input.source || "manual",
    groupId: input.groupId || null,
  };
}

function assertValidKeyword(input) {
  if (!input.keyword) {
    const error = new Error("Keyword is required");
    error.statusCode = 422;
    throw error;
  }
}

function assertWebsiteAccess(user, website) {
  if (!website || website.client.agencyId !== user.agencyId || !canAccessClient(user, website.clientId)) {
    const error = new Error("Website not found or access denied");
    error.statusCode = 404;
    throw error;
  }
}

function movementForKeyword(keyword) {
  const rankings = keyword.rankings ?? [];
  const first = rankings[0]?.rankPosition ?? null;
  const latest = rankings.at(-1)?.rankPosition ?? null;
  const previous = rankings.at(-2)?.rankPosition ?? null;
  const delta = latest && first ? first - latest : 0;

  return {
    latest,
    previous,
    delta,
    status: !latest || !previous ? "unchanged" : latest < previous ? "improved" : latest > previous ? "declined" : "unchanged",
    top3: latest !== null && latest <= 3,
    top10: latest !== null && latest <= 10,
    top100: latest !== null && latest <= 100,
  };
}

function summarizeKeywords(keywords) {
  const movements = keywords.map(movementForKeyword);
  return {
    total: keywords.length,
    improved: movements.filter((movement) => movement.status === "improved").length,
    declined: movements.filter((movement) => movement.status === "declined").length,
    unchanged: movements.filter((movement) => movement.status === "unchanged").length,
    top3: movements.filter((movement) => movement.top3).length,
    top10: movements.filter((movement) => movement.top10).length,
    top100: movements.filter((movement) => movement.top100).length,
  };
}

function withMovement(keyword) {
  return { ...keyword, movement: movementForKeyword(keyword) };
}

function generateRankings(keyword, days) {
  const today = new Date();
  const base = 15 + Math.abs([...keyword.keyword].reduce((total, char) => total + char.charCodeAt(0), 0) % 70);

  return Array.from({ length: days }, (_, index) => {
    const recordedAt = new Date(today);
    recordedAt.setDate(today.getDate() - (days - index - 1));
    const trend = Math.round((days - index) / 8);
    const wave = Math.round(Math.sin(index / 4) * 4);
    const rankPosition = Math.max(1, Math.min(100, base - trend + wave));
    return { rankPosition, recordedAt, source: "mock" };
  });
}

function parseCsv(csv) {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean);
  if (!rows.length) return [];
  const headers = rows[0].split(",").map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const values = row.split(",").map((value) => value.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export class KeywordService {
  constructor(keywordRepository) {
    this.keywordRepository = keywordRepository;
  }

  async listDashboard(user, websiteId, filters) {
    const website = await this.keywordRepository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const [groups, keywords] = await Promise.all([
      this.keywordRepository.listGroups(websiteId),
      this.keywordRepository.listKeywords(websiteId, filters),
    ]);
    return { website, groups, keywords: keywords.map(withMovement), summary: summarizeKeywords(keywords) };
  }

  async createGroup(user, websiteId, name) {
    const website = await this.keywordRepository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    return this.keywordRepository.createGroup(websiteId, name);
  }

  async createKeyword(user, websiteId, input) {
    const website = await this.keywordRepository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const normalized = normalizeKeyword(input);
    assertValidKeyword(normalized);
    return withMovement(await this.keywordRepository.createKeyword(websiteId, normalized));
  }

  async updateKeyword(user, keywordId, input) {
    const keyword = await this.keywordRepository.findKeywordById(keywordId);
    assertWebsiteAccess(user, keyword?.website);
    const normalized = normalizeKeyword({ ...keyword, ...input });
    assertValidKeyword(normalized);
    return withMovement(await this.keywordRepository.updateKeyword(keywordId, normalized));
  }

  async deleteKeyword(user, keywordId) {
    const keyword = await this.keywordRepository.findKeywordById(keywordId);
    assertWebsiteAccess(user, keyword?.website);
    await this.keywordRepository.deleteKeyword(keywordId);
    return { deleted: true };
  }

  async generateMockRankings(user, websiteId, days) {
    const dashboard = await this.listDashboard(user, websiteId, {});
    const boundedDays = days === 90 ? 90 : 30;
    await Promise.all(
      dashboard.keywords.map((keyword) => this.keywordRepository.replaceRankings(keyword.id, generateRankings(keyword, boundedDays))),
    );
    return this.listDashboard(user, websiteId, {});
  }

  async importKeywords(user, websiteId, payload) {
    const website = await this.keywordRepository.findWebsiteById(websiteId);
    assertWebsiteAccess(user, website);
    const rows = typeof payload.csv === "string" ? parseCsv(payload.csv) : payload.keywords ?? [];
    const created = [];
    for (const row of rows) {
      const normalized = normalizeKeyword(row);
      assertValidKeyword(normalized);
      created.push(withMovement(await this.keywordRepository.createKeyword(websiteId, normalized)));
    }
    return { imported: created.length, keywords: created };
  }

  async exportKeywords(user, websiteId, filters) {
    const dashboard = await this.listDashboard(user, websiteId, filters);
    const lines = [csvColumns.join(",")];
    for (const keyword of dashboard.keywords) {
      lines.push(csvColumns.map((column) => escapeCsv(keyword[column])).join(","));
    }
    return lines.join("\n");
  }
}
