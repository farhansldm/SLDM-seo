import { describe, expect, it, vi } from "vitest";

import { SiteCrawler } from "../server/crawlers/siteCrawler.js";

function htmlResponse(body, status = 200, contentType = "text/html") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

describe("SiteCrawler", () => {
  it("crawls same-origin HTML and extracts technical SEO signals", async () => {
    const pages = new Map([
      ["https://example.test/", htmlResponse(`
        <html><head>
          <title>Example Store</title>
          <meta name="description" content="A useful example store.">
          <link rel="canonical" href="/">
        </head><body>
          <h1>Example Store</h1>
          <a href="/about">About</a>
          <a href="https://outside.test/page">Outside</a>
        </body></html>
      `)],
      ["https://example.test/sitemap.xml", htmlResponse(
        "<urlset><url><loc>https://example.test/</loc></url></urlset>",
        200,
        "application/xml",
      )],
      ["https://example.test/about", htmlResponse(`
        <html><head><meta name="robots" content="noindex"></head><body>
          <h1>About</h1><h1>Our team</h1><img src="team.jpg">
        </body></html>
      `)],
    ]);
    const fetchImpl = vi.fn(async (url) => pages.get(url) ?? htmlResponse("Not found", 404));
    const crawler = new SiteCrawler({
      fetchImpl,
      maxPages: 5,
      validateTarget: async () => {},
    });

    const result = await crawler.crawl("example.test");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      url: "https://example.test/",
      title: "Example Store",
      h1: "Example Store",
      h1Count: 1,
      canonicalUrl: "https://example.test/",
      sitemapIncluded: true,
    });
    expect(result[1]).toMatchObject({
      url: "https://example.test/about",
      title: "",
      h1Count: 2,
      isIndexable: false,
      missingAltImages: 1,
      sitemapIncluded: false,
    });
    expect(fetchImpl).not.toHaveBeenCalledWith("https://outside.test/page", expect.anything());
  });

  it("returns an actionable error when no page can be reached", async () => {
    const crawler = new SiteCrawler({
      fetchImpl: vi.fn(async () => { throw new Error("network unavailable"); }),
      validateTarget: async () => {},
    });

    await expect(crawler.crawl("unavailable.test")).rejects.toMatchObject({
      message: "network unavailable",
    });
  });
});
