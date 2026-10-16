import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { navigationForRole, titleForPath } from "../src/app/navigation.js";

function labelsFor(role) {
  return navigationForRole(role).flatMap((group) => group.items.map((item) => item.label));
}

function pathsFor(role) {
  return navigationForRole(role).flatMap((group) => group.items.map((item) => item.path));
}

describe("role-specific navigation smoke", () => {
  it("gives administrators the full internal workspace", () => {
    expect(labelsFor("admin")).toEqual(expect.arrayContaining([
      "Overview",
      "Clients",
      "Websites",
      "SEO performance",
      "Keywords",
      "Technical audits",
      "AI analyst",
      "Tasks and alerts",
      "Reports",
    ]));
    expect(labelsFor("admin")).not.toContain("Client portal");
  });

  it("keeps managers on delivery and intelligence tools without agency onboarding surfaces", () => {
    expect(pathsFor("manager")).toEqual(expect.arrayContaining(["/", "/clients", "/websites", "/seo-dashboard", "/keywords", "/audits", "/ai", "/tasks", "/reports"]));
    expect(pathsFor("manager")).not.toContain("/portal");
  });

  it("limits employees to assigned delivery work without report approvals", () => {
    expect(labelsFor("employee")).toEqual(expect.arrayContaining(["Overview", "Tasks and alerts", "AI analyst", "Keywords"]));
    expect(labelsFor("employee")).not.toContain("Reports");
    expect(labelsFor("employee")).not.toContain("Client portal");
  });

  it("keeps the client experience limited to the portal", () => {
    expect(labelsFor("client")).toEqual(["Client portal"]);
    expect(pathsFor("client")).toEqual(["/portal"]);
  });

  it("resolves breadcrumb titles for every navigable route", () => {
    for (const path of new Set(["/", "/clients", "/websites", "/seo-dashboard", "/keywords", "/audits", "/ai", "/tasks", "/reports", "/portal"])) {
      expect(titleForPath(path)).not.toBe("Workspace");
    }
  });
});

describe("production bundle budget", () => {
  it("keeps the main entry and vendor chunks within agreed gzip-friendly size limits", () => {
    const assetsDir = join(process.cwd(), "dist", "assets");
    let files = [];
    try {
      files = readdirSync(assetsDir).filter((name) => name.endsWith(".js"));
    } catch {
      expect.fail("Production build assets were not found. Run npm run build before this check.");
    }

    const sizes = Object.fromEntries(files.map((name) => [name, statSync(join(assetsDir, name)).size]));
    const total = Object.values(sizes).reduce((sum, size) => sum + size, 0);
    const largest = Math.max(...Object.values(sizes));

    // Raw JS budgets (pre-gzip). Last measured build stays well under these ceilings.
    expect(total).toBeLessThan(2_200_000);
    expect(largest).toBeLessThan(550_000);
    expect(files.some((name) => name.includes("react-vendor"))).toBe(true);
    expect(files.some((name) => name.includes("charts-vendor") || name.includes("LineChart") || name.includes("CartesianGrid"))).toBe(true);
  });
});
