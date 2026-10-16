import { useState } from "react";
import { BarChart3, ExternalLink, Globe2, Pencil, Plus, Radar, Settings2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, Badge, Button, Checkbox, ConfirmationActions, Dialog, EmptyState, ErrorState, IconButton, Input, PageHeader, Panel, Select, Skeleton, Tabs, Toolbar, useToast } from "../../components/ui/index.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createCompetitor, createWebsite, deleteCompetitor, updateCompetitor, updateWebsite } from "./websiteApi.js";

const emptyWebsite = { domain: "", cms: "WordPress", businessCategory: "", preferredLocale: "en-US", primaryCountry: "United States", targetLocations: "United States", targetSearchEngines: ["google"], status: "active", isMock: false };
const emptyCompetitor = { domain: "", name: "", priority: "medium", source: "manual" };
const websiteTabs = [{ value: "overview", label: "Overview", icon: BarChart3 }, { value: "settings", label: "Settings", icon: Settings2 }, { value: "competitors", label: "Competitors", icon: Radar }];

function domainName(value) {
  const candidate = value.trim();
  if (!candidate) return "";
  try { return new URL(candidate.includes("://") ? candidate : `https://${candidate}`).hostname; } catch { return candidate; }
}

function toForm(website) {
  if (!website) return emptyWebsite;
  return { domain: website.domain, cms: website.cms ?? "WordPress", businessCategory: website.businessCategory ?? "", preferredLocale: website.preferredLocale ?? "en-US", primaryCountry: website.primaryCountry ?? "United States", targetLocations: Array.isArray(website.targetLocations) ? website.targetLocations.join(", ") : "", targetSearchEngines: Array.isArray(website.targetSearchEngines) ? website.targetSearchEngines : ["google"], status: website.status, isMock: Boolean(website.isMock) };
}

export function WebsitesPage() {
  const workspace = useWorkspace();
  const { notify } = useToast();
  const selected = workspace.websites.find((website) => website.id === workspace.websiteId) ?? null;
  const [activeTab, setActiveTab] = useState("overview");
  const [websiteDialog, setWebsiteDialog] = useState(false);
  const [competitorDialog, setCompetitorDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyWebsite);
  const [competitor, setCompetitor] = useState(emptyCompetitor);
  const [competitorToRemove, setCompetitorToRemove] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() { setEditing(false); setForm({ ...emptyWebsite, primaryCountry: workspace.selectedClient?.primaryCountry ?? "United States" }); setWebsiteDialog(true); }
  function openEdit() { if (!selected) return; setEditing(true); setForm(toForm(selected)); setWebsiteDialog(true); }
  function toggleEngine(engine) { setForm((current) => ({ ...current, targetSearchEngines: current.targetSearchEngines.includes(engine) ? current.targetSearchEngines.filter((item) => item !== engine) : [...current.targetSearchEngines, engine] })); }

  async function submitWebsite(event) {
    event.preventDefault(); setError(""); setIsSaving(true);
    try {
      if (!workspace.clientId) throw new Error("Select a client from the workspace header first");
      const input = { ...form, domain: domainName(form.domain), targetLocations: form.targetLocations.split(",").map((value) => value.trim()).filter(Boolean) };
      if (!input.targetSearchEngines.length) throw new Error("Choose at least one search engine");
      const response = editing ? await updateWebsite(selected.id, input) : await createWebsite(workspace.clientId, input);
      await workspace.refreshWebsites();
      workspace.setWebsiteId(response.website.id);
      setWebsiteDialog(false); notify(editing ? "Website settings updated" : "Website workspace created", "success");
    } catch (requestError) { setError(requestError.message); } finally { setIsSaving(false); }
  }

  async function changeCompetitorPriority(competitorId, priority) {
    setError("");
    try {
      await updateCompetitor(competitorId, { priority });
      await workspace.refreshWebsites();
      notify("Competitor priority updated", "success");
    } catch (requestError) { setError(requestError.message); }
  }

  async function removeCompetitor() {
    if (!competitorToRemove) return;
    setError(""); setIsSaving(true);
    try {
      await deleteCompetitor(competitorToRemove.id);
      await workspace.refreshWebsites();
      setCompetitorToRemove(null);
      notify("Competitor removed", "success");
    } catch (requestError) { setError(requestError.message); } finally { setIsSaving(false); }
  }

  async function addCompetitor(event) {
    event.preventDefault(); setError(""); setIsSaving(true);
    try {
      if (!selected) throw new Error("Select a website first");
      await createCompetitor(selected.id, { ...competitor, domain: domainName(competitor.domain) });
      setCompetitor(emptyCompetitor); await workspace.refreshWebsites(); setCompetitorDialog(false); notify("Competitor added", "success");
    } catch (requestError) { setError(requestError.message); } finally { setIsSaving(false); }
  }

  return <main className="page-shell websites-page">
    <PageHeader actions={<Button disabled={!workspace.clientId} icon={Plus} onClick={openCreate}>Add website</Button>} description="Configure website targets, search markets, and competitors inside the active client workspace." eyebrow="Website portfolio" title="Websites" />
    {error ? <Alert tone="error" title="Website request failed">{error}</Alert> : null}
    <Toolbar label="Website context"><div className="website-client-context"><span>Active client</span><strong>{workspace.selectedClient?.companyName ?? "Select a client from the header"}</strong><small>{workspace.websitesStatus === "loading" ? "Loading websites" : `${workspace.websites.length} website${workspace.websites.length === 1 ? "" : "s"}`}</small></div><Select label="Website" onChange={(event) => workspace.setWebsiteId(event.target.value)} value={workspace.websiteId}><option value="">Select website</option>{workspace.websites.map((website) => <option key={website.id} value={website.id}>{website.domain}</option>)}</Select>{selected ? <Button icon={Pencil} onClick={openEdit} variant="secondary">Edit settings</Button> : null}</Toolbar>

    {workspace.status === "error" ? <Panel className="website-empty-panel"><ErrorState action={<Button onClick={workspace.refreshClients}>Try again</Button>} description="The active client could not be loaded." title="Workspace unavailable" /></Panel> : workspace.websitesStatus === "error" ? <Panel className="website-empty-panel"><ErrorState action={<Button onClick={() => workspace.refreshWebsites().catch(() => {})}>Try again</Button>} description="Websites for this client could not be loaded." title="Websites unavailable" /></Panel> : workspace.status === "loading" || workspace.websitesStatus === "loading" ? <Panel className="website-empty-panel"><Skeleton lines={6} /></Panel> : !workspace.clientId ? <Panel className="website-empty-panel"><EmptyState description="Choose a client in the workspace header before adding or managing websites." icon={Globe2} title="Select a client" /></Panel> : !selected ? <Panel className="website-empty-panel"><EmptyState action={<Button icon={Plus} onClick={openCreate}>Add first website</Button>} description="Create a website workspace for SEO research, audits, tasks, and reporting." icon={Globe2} title="No websites for this client" /></Panel> : <>
      <section className="website-identity"><div><span className="website-favicon"><Globe2 size={22} /></span><div><h2>{selected.domain}</h2><p>{selected.businessCategory ?? "Business category not set"} · {selected.cms ?? "Platform not set"}</p></div></div><div><Badge tone={selected.status === "active" ? "success" : "neutral"}>{selected.status}</Badge><a aria-label={`Open ${selected.domain}`} href={`https://${selected.domain}`} rel="noreferrer" target="_blank"><ExternalLink size={17} /></a></div></section>
      <Tabs active={activeTab} ariaLabel="Website sections" items={websiteTabs} onChange={setActiveTab} />
      <section className="website-tab-content">
        {activeTab === "overview" ? <div className="website-overview-grid"><Panel title="Workspace readiness"><dl className="detail-list"><div><dt>CMS</dt><dd>{selected.cms ?? "Not set"}</dd></div><div><dt>Locale</dt><dd>{selected.preferredLocale ?? "Not set"}</dd></div><div><dt>Primary market</dt><dd>{selected.primaryCountry ?? "Not set"}</dd></div><div><dt>SEO score</dt><dd>{selected.seoScore ?? "No audit"}</dd></div></dl></Panel><Panel title="Targeting"><div className="website-targets"><div><span>Locations</span><p>{Array.isArray(selected.targetLocations) && selected.targetLocations.length ? selected.targetLocations.join(", ") : "No locations configured"}</p></div><div><span>Search engines</span><p>{Array.isArray(selected.targetSearchEngines) ? selected.targetSearchEngines.join(", ") : "Google"}</p></div><div><span>Data state</span><Badge tone={selected.isMock ? "warning" : "info"}>{selected.isMock ? "Demo workspace" : "Awaiting connected data"}</Badge></div></div></Panel><Panel actions={<Link className="panel-link" to="/audits">Open audits</Link>} title="Technical health"><EmptyState description={selected.lastAuditAt ? `Last audited ${new Date(selected.lastAuditAt).toLocaleDateString()}` : "Run the first crawl to establish technical health."} icon={BarChart3} title={selected.seoScore != null ? `SEO score ${selected.seoScore}` : "No audit baseline"} /></Panel></div> : null}
        {activeTab === "settings" ? <Panel actions={<Button icon={Pencil} onClick={openEdit} size="sm" variant="secondary">Edit</Button>} title="Search configuration"><dl className="settings-list"><div><dt>Domain</dt><dd>{selected.domain}</dd></div><div><dt>Website platform</dt><dd>{selected.cms ?? "Not set"}</dd></div><div><dt>Business category</dt><dd>{selected.businessCategory ?? "Not set"}</dd></div><div><dt>Content language</dt><dd>{selected.preferredLocale ?? "Not set"}</dd></div><div><dt>Primary country</dt><dd>{selected.primaryCountry ?? "Not set"}</dd></div><div><dt>Target locations</dt><dd>{selected.targetLocations?.join?.(", ") || "Not set"}</dd></div><div><dt>Search engines</dt><dd>{selected.targetSearchEngines?.join?.(", ") || "Google"}</dd></div></dl></Panel> : null}
        {activeTab === "competitors" ? <Panel actions={<Button icon={Plus} onClick={() => setCompetitorDialog(true)} size="sm">Add competitor</Button>} description="Domains compared against this website" title="Competitors"><div className="competitor-grid">{selected.competitors?.length ? selected.competitors.map((item) => <article key={item.id}><div><span className="record-icon"><Radar size={17} /></span><span><strong>{item.name || item.domain}</strong><small>{item.domain}</small></span></div><div className="competitor-actions"><Select aria-label={`Priority for ${item.domain}`} onChange={(event) => changeCompetitorPriority(item.id, event.target.value)} value={item.priority}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select><small>{item.backlinks?.length ?? 0} known links</small><IconButton icon={Trash2} label={`Remove ${item.domain}`} onClick={() => setCompetitorToRemove(item)} size="sm" /></div></article>) : <EmptyState action={<Button icon={Plus} onClick={() => setCompetitorDialog(true)}>Add competitor</Button>} description="Add the domains this website competes with in organic search." icon={Radar} title="No competitors" />}</div></Panel> : null}
      </section>
    </>}

    <Dialog description={editing ? "Update targeting and website metadata." : `Add a website to ${workspace.selectedClient?.companyName ?? "this client"}.`} onClose={() => setWebsiteDialog(false)} open={websiteDialog} title={editing ? "Edit website" : "Add website"}><form className="website-form" onSubmit={submitWebsite}><Input label="Domain" onChange={(event) => setForm({ ...form, domain: event.target.value })} placeholder="example.com" required value={form.domain} /><div className="ui-form-grid"><Select label="Website platform" onChange={(event) => setForm({ ...form, cms: event.target.value })} value={form.cms}><option>WordPress</option><option>Shopify</option><option>Webflow</option><option>Wix</option><option>Squarespace</option><option value="Custom">Custom or other</option></Select><Select label="Status" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}><option value="active">Active</option><option value="paused">Paused</option></Select></div><Input label="Business category" onChange={(event) => setForm({ ...form, businessCategory: event.target.value })} placeholder="e.g. Dental clinic" value={form.businessCategory} /><div className="ui-form-grid"><Select label="Content language" onChange={(event) => setForm({ ...form, preferredLocale: event.target.value })} value={form.preferredLocale}><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="en-IN">English (India)</option><option value="hi-IN">Hindi (India)</option></Select><Input label="Primary country" onChange={(event) => setForm({ ...form, primaryCountry: event.target.value })} value={form.primaryCountry} /></div><Input hint="Separate multiple locations with commas" label="Target locations" onChange={(event) => setForm({ ...form, targetLocations: event.target.value })} value={form.targetLocations} /><fieldset className="website-engine-options"><legend>Search engines</legend><Checkbox checked={form.targetSearchEngines.includes("google")} label="Google" onChange={() => toggleEngine("google")} /><Checkbox checked={form.targetSearchEngines.includes("bing")} label="Bing" onChange={() => toggleEngine("bing")} /></fieldset>{error ? <Alert tone="error">{error}</Alert> : null}<div className="ui-confirm-actions"><Button onClick={() => setWebsiteDialog(false)} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">{isSaving ? "Saving..." : editing ? "Save changes" : "Create website"}</Button></div></form></Dialog>
    <Dialog description={`Track another domain against ${selected?.domain ?? "this website"}.`} onClose={() => setCompetitorDialog(false)} open={competitorDialog} title="Add competitor"><form className="ui-form-stack" onSubmit={addCompetitor}><Input label="Competitor domain" onChange={(event) => setCompetitor({ ...competitor, domain: event.target.value })} placeholder="competitor.com" required value={competitor.domain} /><Input label="Display name" onChange={(event) => setCompetitor({ ...competitor, name: event.target.value })} placeholder="Optional" value={competitor.name} /><Select label="Priority" onChange={(event) => setCompetitor({ ...competitor, priority: event.target.value })} value={competitor.priority}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>{error ? <Alert tone="error">{error}</Alert> : null}<div className="ui-confirm-actions"><Button onClick={() => setCompetitorDialog(false)} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">{isSaving ? "Adding..." : "Add competitor"}</Button></div></form></Dialog>
    <Dialog description={competitorToRemove ? `${competitorToRemove.domain} will be removed from comparison for this website.` : ""} onClose={() => setCompetitorToRemove(null)} open={Boolean(competitorToRemove)} title="Remove competitor"><ConfirmationActions confirmLabel={isSaving ? "Removing..." : "Remove competitor"} destructive onCancel={() => setCompetitorToRemove(null)} onConfirm={removeCompetitor} /></Dialog>
  </main>;
}
