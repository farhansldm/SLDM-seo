import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import puppeteer from "puppeteer";

const root = "D:/SLDM/SLDM-seo";
const inputPath = path.join(root, "features-use-cases-10-day-timeline.md");
const htmlPath = path.join(root, "output/html/features-use-cases-10-day-timeline-preview.html");
const pdfPath = path.join(root, "output/pdf/features-use-cases-10-day-timeline-exact-preview.pdf");

const markdown = fs.readFileSync(inputPath, "utf8");
const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info.trim();
  if (info === "mermaid") return `<pre class="mermaid">${md.utils.escapeHtml(token.content)}</pre>`;
  return defaultFence(tokens, idx, options, env, self);
};

const body = md.render(markdown);
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SEO Agency Platform Plan</title>
  <style>
    @page { size: A4; margin: 18mm 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172026; background: #ffffff; font-family: Inter, Segoe UI, Arial, sans-serif; font-size: 11px; line-height: 1.48; }
    main { max-width: 980px; margin: 0 auto; }
    h1 { margin: 0 0 18px; padding: 26px 30px; color: #ffffff; background: #172026; border-radius: 10px; font-size: 28px; line-height: 1.15; page-break-after: avoid; }
    h2 { margin: 28px 0 10px; padding-bottom: 7px; border-bottom: 1px solid #d8e1e8; color: #172026; font-size: 18px; line-height: 1.25; page-break-after: avoid; }
    h3 { margin: 18px 0 8px; color: #25313a; font-size: 14px; line-height: 1.3; page-break-after: avoid; }
    p { margin: 7px 0; }
    ul, ol { margin: 7px 0 10px 22px; padding: 0; }
    li { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 9px; page-break-inside: avoid; }
    th, td { border: 1px solid #d8e1e8; padding: 6px 7px; text-align: left; vertical-align: top; }
    th { background: #eef4f8; font-weight: 700; }
    tr:nth-child(even) td { background: #fafcfd; }
    code { background: #eef4f8; border-radius: 4px; padding: 1px 4px; font-family: Consolas, Courier New, monospace; font-size: 0.92em; }
    pre:not(.mermaid) { white-space: pre-wrap; background: #f5f7fa; border: 1px solid #d8e1e8; border-radius: 8px; padding: 12px; overflow: hidden; page-break-inside: avoid; }
    .mermaid { margin: 14px 0 20px; padding: 14px; border: 1px solid #d8e1e8; border-radius: 8px; background: #fbfdff; text-align: center; page-break-inside: avoid; white-space: normal; }
    .mermaid svg { max-width: 100%; height: auto !important; }
  </style>
</head>
<body>
  <main>${body}</main>
  <script type="module">
    import mermaid from "/node_modules/mermaid/dist/mermaid.esm.min.mjs";
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: {
        primaryColor: "#eaf4fb",
        primaryTextColor: "#172026",
        primaryBorderColor: "#7aa7c7",
        lineColor: "#52616b",
        secondaryColor: "#f7fbff",
        tertiaryColor: "#ffffff",
        fontFamily: "Inter, Segoe UI, Arial, sans-serif"
      }
    });
    try {
      await mermaid.run({ querySelector: ".mermaid", suppressErrors: false });
      window.__MERMAID_RENDERED__ = true;
    } catch (error) {
      console.error(error?.message || error);
      window.__MERMAID_ERROR__ = error?.message || String(error);
      window.__MERMAID_RENDERED__ = true;
    }
  </script>
</body>
</html>`;

fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
fs.writeFileSync(htmlPath, html, "utf8");

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".mjs") || filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wasm")) return "application/wasm";
  return "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const decoded = decodeURIComponent(url.pathname).replace(/^\//, "");
  const filePath = path.resolve(root, decoded || "output/html/features-use-cases-10-day-timeline-preview.html");
  if (!filePath.startsWith(path.resolve(root))) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end("Not found"); return;
  }
  res.writeHead(200, { "Content-Type": contentType(filePath) });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const page = await browser.newPage();
page.on("console", (msg) => console.log(`browser ${msg.type()}: ${msg.text()}`));
await page.goto(`http://127.0.0.1:${port}/output/html/features-use-cases-10-day-timeline-preview.html`, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__MERMAID_RENDERED__ === true", { timeout: 60000 });
const renderState = await page.evaluate(() => ({ diagrams: document.querySelectorAll(".mermaid").length, svgs: document.querySelectorAll(".mermaid svg").length, error: window.__MERMAID_ERROR__ || null }));
if (renderState.error || renderState.svgs < renderState.diagrams) {
  throw new Error(`Mermaid render incomplete: ${JSON.stringify(renderState)}`);
}
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: "<div style='width:100%;font-size:8px;color:#6b7b88;padding:0 15mm;text-align:right;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>",
  margin: { top: "18mm", right: "15mm", bottom: "18mm", left: "15mm" },
});
await browser.close();
server.close();
console.log(JSON.stringify(renderState));
console.log(htmlPath);
console.log(pdfPath);