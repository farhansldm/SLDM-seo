const outputByType = {
  keyword_expansion: "## Priority opportunities\nValidate long-tail service and comparison terms against current volume and difficulty data.\n\n## Topic clusters\nGroup opportunities by intent before assigning target pages.\n\n## Quick wins\nPrioritize relevant terms where the site already ranks near page one.\n\n## Validation notes\nConfirm live SERP data before publishing recommendations.",
  backlink_prospects: "## Priority prospects\nStart with topically relevant domains linking to competitors but not the client.\n\n## Why each prospect fits\nPrioritize relevance, editorial fit, and authority together.\n\n## Outreach angles\nOffer a useful resource, expert contribution, or replacement for a broken reference.\n\n## Risk checks\nReview traffic quality, link patterns, and editorial standards before outreach.",
  ranking_explanation: "## What changed\nThe supplied ranking history contains movement that should be reviewed by keyword and landing page.\n\n## Likely causes\nCompare page changes, technical issues, competitor movement, and SERP intent.\n\n## Confidence and evidence\nThis is a directional explanation based only on stored platform data.\n\n## Recommended actions\nValidate the SERP, inspect the ranking URL, and assign the highest-impact correction.",
  content_brief: "## Search intent\nConfirm the dominant SERP intent before drafting.\n\n## Recommended outline\nLead with the direct answer, then cover evaluation criteria, evidence, and next steps.\n\n## Entities and questions\nUse the supplied keyword and competitor themes as the research set.\n\n## On-page requirements\nCreate a unique title, clear headings, concise metadata, and useful supporting evidence.\n\n## Internal links\nLink from relevant authoritative pages and back to the appropriate conversion page.",
  audit_summary: "## Executive summary\nThe latest stored audit should be addressed by severity and affected reach.\n\n## Critical issues\nResolve high-severity indexation, status, canonical, and metadata failures first.\n\n## Prioritized fixes\nGroup repeated findings into one engineering task where possible.\n\n## Expected impact\nImproved crawlability and clearer page signals should precede content expansion.\n\n## Verification steps\nRe-run the crawl and compare issue counts after deployment.",
  report_summary: "## Performance summary\nSummarize movement using the stored period metrics without implying unsupported causation.\n\n## Completed work\nCall out completed tasks that fall within the reporting period.\n\n## Risks\nHighlight ranking declines and unresolved high-severity audit findings.\n\n## Next priorities\nRecommend a small, ordered set of measurable actions for the next period.",
};

export class MockAiProvider {
  name = "mock";
  model = "seo-research-v1";

  async generate({ type }) {
    return { text: outputByType[type], providerRequestId: null, usage: null };
  }
}
