import { describe, expect, it } from "vitest";

import { navigationForRole, titleForPath } from "../src/app/navigation.js";

function labelsFor(role) {
  return navigationForRole(role).flatMap((group) => group.items.map((item) => item.label));
}

describe("application navigation", () => {
  it("shows internal delivery tools to agency administrators", () => {
    expect(labelsFor("admin")).toEqual(expect.arrayContaining(["Clients", "AI analyst", "Reports"]));
  });

  it("keeps internal agency tools out of the client navigation", () => {
    expect(labelsFor("client")).toEqual(["Client portal"]);
  });

  it("uses readable breadcrumb titles for known routes", () => {
    expect(titleForPath("/seo-dashboard")).toBe("SEO performance");
    expect(titleForPath("/unknown")).toBe("Workspace");
  });
});
