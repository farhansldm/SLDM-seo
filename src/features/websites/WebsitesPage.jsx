import { useState } from "react";

import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createCompetitor, createWebsite } from "./websiteApi.js";

const initialWebsite = {
  domain: "",
  cms: "WordPress",
  businessCategory: "",
  preferredLocale: "en-US",
  primaryCountry: "United States",
  targetLocations: "United States",
  targetSearchEngines: "google,bing",
  isMock: true,
};

const initialCompetitor = { domain: "", name: "", priority: "medium", source: "manual" };

function domainName(value) {
  const candidate = value.trim();
  if (!candidate) return "";
  try {
    return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname;
  } catch {
    return candidate;
  }
}

export function WebsitesPage() {
  const {
    clientId,
    selectedClient,
    websites,
    websiteId,
    setWebsiteId,
    refreshWebsites,
  } = useWorkspace();
  const selected = websites.find((website) => website.id === websiteId) ?? null;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(initialWebsite);
  const [competitor, setCompetitor] = useState(initialCompetitor);

  async function run(callback) {
    setError("");
    setNotice("");
    try {
      await callback();
    } catch (runError) {
      setError(runError.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      if (!clientId) throw new Error("Select a client from the workspace header first");
      await createWebsite(clientId, {
        ...form,
        domain: domainName(form.domain),
        targetLocations: form.targetLocations.split(",").map((value) => value.trim()).filter(Boolean),
        targetSearchEngines: form.targetSearchEngines.split(",").map((value) => value.trim()).filter(Boolean),
      });
      setForm((current) => ({ ...current, domain: "" }));
      await refreshWebsites();
      setNotice("Website workspace created");
    });
  }

  async function addCompetitor() {
    await run(async () => {
      if (!selected) throw new Error("Select a website first");
      await createCompetitor(selected.id, { ...competitor, domain: domainName(competitor.domain) });
      setCompetitor(initialCompetitor);
      await refreshWebsites();
      setNotice("Competitor added with backlink placeholder");
    });
  }

  return (
    <main className="page-shell ops-page">
      <header className="page-header">
        <span>SEO workspace setup</span>
        <h1>Website and Competitor Management</h1>
        <p>Create website workspaces, store SEO settings, add competitors, and generate backlink placeholders.</p>
      </header>

      <section className="ops-toolbar" aria-live="polite">
        <span>Active client</span>
        <strong>{selectedClient?.companyName ?? "Select a client from the header"}</strong>
      </section>
      {error ? <p className="auth-error keyword-error">{error}</p> : null}
      {notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      <section className="ops-layout">
        <form className="ops-panel" onSubmit={submit}>
          <h2>Add Website</h2>
          <input disabled={!clientId} placeholder="Domain" required value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} />
          <input disabled={!clientId} placeholder="CMS" value={form.cms} onChange={(event) => setForm({ ...form, cms: event.target.value })} />
          <input disabled={!clientId} placeholder="Business category" value={form.businessCategory} onChange={(event) => setForm({ ...form, businessCategory: event.target.value })} />
          <input disabled={!clientId} placeholder="Locale" value={form.preferredLocale} onChange={(event) => setForm({ ...form, preferredLocale: event.target.value })} />
          <input disabled={!clientId} placeholder="Locations CSV" value={form.targetLocations} onChange={(event) => setForm({ ...form, targetLocations: event.target.value })} />
          <input disabled={!clientId} placeholder="Search engines CSV" value={form.targetSearchEngines} onChange={(event) => setForm({ ...form, targetSearchEngines: event.target.value })} />
          <button disabled={!clientId} type="submit">Create website</button>
        </form>

        <div className="ops-panel">
          <h2>Websites</h2>
          {websites.length === 0 ? <p>No websites for this client yet.</p> : null}
          {websites.map((website) => (
            <button className="row-button" key={website.id} onClick={() => setWebsiteId(website.id)} type="button">
              <strong>{website.domain}</strong>
              <span>{website.cms ?? "CMS"} · {website.businessCategory ?? "category"}</span>
            </button>
          ))}
        </div>

        <div className="ops-panel">
          <h2>Competitors</h2>
          {selected ? (
            <>
              <p>{selected.domain}</p>
              <div className="tab-list">{selected.tabs?.map((tab) => <span key={tab.tab}>{tab.tab}</span>)}</div>
              <input placeholder="Competitor domain" value={competitor.domain} onChange={(event) => setCompetitor({ ...competitor, domain: event.target.value })} />
              <input placeholder="Name" value={competitor.name} onChange={(event) => setCompetitor({ ...competitor, name: event.target.value })} />
              <button onClick={addCompetitor} type="button">Add competitor</button>
              {selected.competitors?.map((item) => <p key={item.id}>{item.domain} · backlinks {item.backlinks?.length ?? 0}</p>)}
            </>
          ) : <p>Select a website.</p>}
        </div>
      </section>
    </main>
  );
}
