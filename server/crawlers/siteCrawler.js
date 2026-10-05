import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import * as cheerio from "cheerio";

const blockedExtensions = /\.(?:7z|avi|css|csv|docx?|gif|gz|ico|jpe?g|js|json|mov|mp3|mp4|pdf|png|pptx?|rar|rss|svg|tar|webp|woff2?|xlsx?|xml|zip)$/i;

function isPrivateAddress(address) {
  if (address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:")) return true;
  if (!address.includes(".")) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a === 0;
}

export async function assertPublicUrl(url) {
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS websites can be audited");
  if (url.username || url.password) throw new Error("Website URLs cannot contain credentials");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) throw new Error("Private network websites cannot be audited");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private network websites cannot be audited");
  }
}

function startingUrl(domain) {
  const value = domain.trim();
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  url.pathname = url.pathname || "/";
  url.hash = "";
  return url;
}

function normalizedLink(value, baseUrl, origin) {
  if (!value || value.startsWith("#") || /^(?:mailto|tel|javascript|data):/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    url.hash = "";
    if (url.origin !== origin || blockedExtensions.test(url.pathname)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|gclid|fbclid)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function resolvedUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function pageDetails(html, response, requestedUrl, loadTimeMs, depth, sitemapUrls, redirected = false) {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  const finalUrl = response.url || requestedUrl;
  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description" i]').attr("content")?.trim() ?? "";
  const headings = $("h1");
  const canonicalUrl = resolvedUrl($('link[rel="canonical" i]').attr("href"), finalUrl);
  const robots = $('meta[name="robots" i]').attr("content")?.toLowerCase() ?? "";
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const missingAltImages = $("img").filter((_, element) => !($(element).attr("alt") ?? "").trim()).length;

  return {
    url: finalUrl,
    statusCode: response.status,
    title,
    metaDescription,
    h1: headings.first().text().trim(),
    h1Count: headings.length,
    canonicalUrl,
    isIndexable: !robots.split(",").some((directive) => directive.trim() === "noindex"),
    wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
    loadTimeMs,
    depth,
    redirected: redirected || response.redirected || finalUrl !== requestedUrl,
    missingAltImages,
    sitemapIncluded: sitemapUrls.size ? sitemapUrls.has(finalUrl) : null,
    links: $("a[href]").map((_, element) => $(element).attr("href")).get(),
  };
}

export class SiteCrawler {
  constructor({
    fetchImpl = globalThis.fetch,
    maxPages = 25,
    timeoutMs = 10000,
    maxResponseBytes = 2_000_000,
    validateTarget = assertPublicUrl,
  } = {}) {
    this.fetch = fetchImpl;
    this.maxPages = maxPages;
    this.timeoutMs = timeoutMs;
    this.maxResponseBytes = maxResponseBytes;
    this.validateTarget = validateTarget;
  }

  async request(url, accept = "text/html,application/xhtml+xml") {
    const startedAt = performance.now();
    let currentUrl = url;
    let response;

    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      await this.validateTarget(new URL(currentUrl));
      response = await this.fetch(currentUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Accept: accept,
          "User-Agent": "SLDMSeoAudit/1.0 (+https://sldm.example/auditor)",
        },
      });
      const location = response.headers.get("location");
      if (!location || response.status < 300 || response.status >= 400) break;
      currentUrl = new URL(location, currentUrl).href;
      if (redirectCount === 5) throw new Error("Website exceeded the redirect limit");
    }

    if (!response) throw new Error("Website did not return a response");
    return {
      response,
      finalUrl: currentUrl,
      redirected: currentUrl !== url,
      loadTimeMs: Math.round(performance.now() - startedAt),
    };
  }

  async sitemapUrls(origin) {
    try {
      const { response } = await this.request(`${origin}/sitemap.xml`, "application/xml,text/xml,*/*");
      if (!response.ok) return new Set();
      const xml = (await response.text()).slice(0, this.maxResponseBytes);
      const $ = cheerio.load(xml, { xmlMode: true });
      return new Set($("loc").map((_, element) => $(element).text().trim()).get());
    } catch {
      return new Set();
    }
  }

  async crawl(domain) {
    let root = startingUrl(domain);
    let firstRequest;
    try {
      firstRequest = await this.request(root.href);
    } catch (httpsError) {
      if (root.protocol !== "https:") throw httpsError;
      root = new URL(root.href);
      root.protocol = "http:";
      firstRequest = await this.request(root.href);
    }

    const firstFinalUrl = new URL(firstRequest.finalUrl || firstRequest.response.url || root.href);
    const origin = firstFinalUrl.origin;
    const sitemapUrls = await this.sitemapUrls(origin);
    const queue = [{ url: root.href, depth: 0, prefetched: firstRequest }];
    const queued = new Set([root.href]);
    const visited = new Set();
    const pages = [];

    while (queue.length && pages.length < this.maxPages) {
      const current = queue.shift();
      if (visited.has(current.url)) continue;
      visited.add(current.url);

      try {
        const { response, finalUrl, loadTimeMs, redirected } = current.prefetched ?? await this.request(current.url);
        const contentType = response.headers.get("content-type") ?? "";
        const contentLength = Number(response.headers.get("content-length") ?? 0);
        if (contentLength > this.maxResponseBytes) throw new Error("Page is larger than the audit response limit");
        const html = contentType.includes("html") || !contentType ? (await response.text()).slice(0, this.maxResponseBytes) : "";
        const page = pageDetails(html, response, finalUrl || current.url, loadTimeMs, current.depth, sitemapUrls, redirected);
        pages.push(page);

        for (const href of page.links) {
          const link = normalizedLink(href, page.url, origin);
          if (link && !queued.has(link) && queued.size < this.maxPages * 4) {
            queued.add(link);
            queue.push({ url: link, depth: current.depth + 1 });
          }
        }
      } catch (error) {
        pages.push({
          url: current.url,
          statusCode: 0,
          title: "",
          metaDescription: "",
          h1: "",
          h1Count: 0,
          canonicalUrl: null,
          isIndexable: null,
          wordCount: 0,
          loadTimeMs: null,
          depth: current.depth,
          missingAltImages: 0,
          crawlError: error.message,
          links: [],
        });
      }
    }

    if (!pages.length || pages.every((page) => page.statusCode === 0)) {
      const error = new Error("The website could not be reached or did not return crawlable HTML");
      error.statusCode = 422;
      throw error;
    }
    return pages;
  }
}
