import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Link2, Radar, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, Badge, Button, ContextSummary, DataTable, EmptyState, ErrorState, KpiCard, PageHeader, Panel, Select, Skeleton, StatusIndicator, Tabs, Toolbar } from "../../components/ui/index.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { fetchSeoDashboard } from "./seoDashboardApi.js";

const viewTabs = [
  { value: "overview", label: "Overview" },
  { value: "keywords", label: "Keywords" },
  { value: "competitors", label: "Competitors" },
  { value: "backlinks", label: "Backlinks" },
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not synced";
}

function percent(value) {
  return `${Math.round(Number(value ?? 0) * 1000) / 10}%`;
}

function shortDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => <span key={item.dataKey}>{item.name}: {item.value}</span>)}
    </div>
  );
}

function ChangeCell({ value }) {
  if (value > 0) return <span className="metric-positive"><ArrowUpRight size={14} />+{value}</span>;
  if (value < 0) return <span className="metric-negative"><ArrowDownRight size={14} />{value}</span>;
  return <span className="metric-neutral">0</span>;
}

export function SeoDashboardPage() {
  const { selectedWebsite, websiteId } = useWorkspace();
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [range, setRange] = useState("30");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadDashboard() {
    if (!websiteId) return;
    setError("");
    setIsLoading(true);
    try {
      setDashboard(await fetchSeoDashboard({ websiteId }));
    } catch (requestError) {
      setError(requestError.message);
      setDashboard(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setDashboard(null);
      setError("");
      if (!websiteId) return;
      setIsLoading(true);
      try {
        const response = await fetchSeoDashboard({ websiteId });
        if (active) setDashboard(response);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [websiteId]);

  const traffic = useMemo(() => {
    const rows = dashboard?.trends?.traffic ?? [];
    if (range === "all") return rows.map((row) => ({ ...row, date: shortDate(row.date) }));
    return rows.slice(-Number(range)).map((row) => ({ ...row, date: shortDate(row.date) }));
  }, [dashboard, range]);

  const ranking = useMemo(() => {
    const rows = dashboard?.trends?.ranking ?? [];
    if (range === "all") return rows.map((row) => ({ ...row, date: shortDate(row.date) }));
    return rows.slice(-Number(range)).map((row) => ({ ...row, date: shortDate(row.date) }));
  }, [dashboard, range]);

  const movement = useMemo(() => {
    const rows = dashboard?.trends?.keywordMovement ?? [];
    if (range === "all") return rows.map((row) => ({ ...row, date: shortDate(row.date) }));
    return rows.slice(-Number(range)).map((row) => ({ ...row, date: shortDate(row.date) }));
  }, [dashboard, range]);

  const kpis = dashboard?.kpis;
  const keywordColumns = [
    { key: "keyword", label: "Keyword" },
    { key: "position", label: "Position" },
    { key: "change", label: "Change", render: (row) => <ChangeCell value={row.change} /> },
  ];
  const pageColumns = [
    { key: "url", label: "Page", render: (row) => <span className="audit-url" title={row.url}>{row.url}</span> },
    { key: "organicTraffic", label: "Traffic" },
    { key: "clicks", label: "Clicks" },
    { key: "impressions", label: "Impressions" },
  ];
  const competitorColumns = [
    { key: "name", label: "Competitor", render: (row) => <span><strong>{row.name}</strong><small className="seo-subline">{row.domain}</small></span> },
    { key: "priority", label: "Priority", render: (row) => <Badge tone={row.priority === "high" ? "danger" : row.priority === "medium" ? "warning" : "neutral"}>{row.priority}</Badge> },
    { key: "keywordCount", label: "Tracked terms" },
    {
      key: "share",
      label: "Share of voice",
      render: (row) => {
        const match = dashboard?.shareOfVoice?.find((item) => item.domain === row.domain);
        return match ? `${match.share}%` : "—";
      },
    },
  ];
  const backlinkColumns = [
    { key: "sourceUrl", label: "Source", render: (row) => <span className="audit-url" title={row.sourceUrl}>{row.sourceUrl}</span> },
    { key: "anchorText", label: "Anchor", render: (row) => row.anchorText || "—" },
    { key: "domainAuthority", label: "DA", render: (row) => row.domainAuthority ?? "—" },
    { key: "isDofollow", label: "Type", render: (row) => <Badge tone={row.isDofollow ? "success" : "neutral"}>{row.isDofollow ? "Dofollow" : "Nofollow"}</Badge> },
    { key: "discoveredAt", label: "Found", render: (row) => row.discoveredAt ? new Date(row.discoveredAt).toLocaleDateString() : "—" },
  ];

  return (
    <main className="page-shell seo-page">
      <PageHeader
        actions={<Button disabled={!websiteId || isLoading} icon={RefreshCw} onClick={loadDashboard} variant="secondary">Refresh</Button>}
        description="Review traffic, visibility, rankings, and competitive share of voice for the active website."
        eyebrow="Performance intelligence"
        title="SEO performance"
      />

      <Toolbar label="SEO dashboard controls">
        <ContextSummary label="Active website" value={selectedWebsite?.domain ?? "Select a website from the header"} />
        <Select aria-label="Chart date range" onChange={(event) => setRange(event.target.value)} value={range}>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All available</option>
        </Select>
        <Link className="panel-link" to="/keywords">Open keywords <ArrowRight size={14} /></Link>
        <Link className="panel-link" to="/audits">Open audits <ArrowRight size={14} /></Link>
      </Toolbar>

      {!websiteId ? <Panel><EmptyState description="Choose a website in the workspace header to load performance analytics." title="Select a website" /></Panel> : null}
      {error ? <Alert tone="error" title="SEO dashboard could not be loaded">{error}</Alert> : null}

      {isLoading && !dashboard ? <section className="seo-kpis">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} lines={2} />)}</section> : null}

      {dashboard ? (
        <>
          <section aria-label="Data freshness" className="freshness-strip">
            <strong>{dashboard.website.domain}</strong>
            <span>{dashboard.client.companyName}</span>
            <StatusIndicator label={dashboard.freshness.mode === "live" ? "Live data" : "Demo data"} status={dashboard.freshness.mode === "live" ? "success" : "warning"} />
            <span>Updated {formatDate(dashboard.freshness.lastUpdatedAt)}</span>
            <Badge tone={dashboard.audience === "client" ? "info" : "neutral"}>{dashboard.audience === "client" ? "Client-safe view" : "Internal view"}</Badge>
          </section>

          <section aria-label="SEO key metrics" className="seo-kpis">
            <KpiCard label="Organic traffic" value={kpis.organicTraffic} />
            <KpiCard label="Clicks" value={kpis.clicks} />
            <KpiCard label="Impressions" value={kpis.impressions} />
            <KpiCard label="CTR" value={percent(kpis.ctr)} />
            <KpiCard label="Avg position" value={kpis.averagePosition || "—"} />
            <KpiCard label="SEO score" value={kpis.seoScore} />
            <KpiCard change={`${kpis.rankingMovement.improved} up · ${kpis.rankingMovement.declined} down`} changeTone={kpis.rankingMovement.declined > kpis.rankingMovement.improved ? "negative" : "positive"} label="Top 10 keywords" value={kpis.rankingMovement.top10} />
            <KpiCard change={`${kpis.tasks.overdue} overdue`} changeTone={kpis.tasks.overdue ? "negative" : "positive"} label="Open tasks" value={kpis.tasks.open} />
          </section>

          <Tabs active={activeTab} ariaLabel="SEO research views" items={viewTabs} onChange={setActiveTab} />

          {activeTab === "overview" ? (
            <section className="seo-grid">
              <Panel title="Traffic trend">
                {traffic.length ? (
                  <ResponsiveContainer height={240} width="100%">
                    <LineChart data={traffic}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<ChartTooltip />} />
                      <Line dataKey="organicTraffic" name="Organic traffic" stroke="var(--chart-1)" strokeWidth={2} />
                      <Line dataKey="clicks" name="Clicks" stroke="var(--chart-3)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState description="Traffic history appears after page metrics are recorded." title="No traffic data" />}
              </Panel>

              <Panel title="Keyword movement">
                {movement.length ? (
                  <ResponsiveContainer height={240} width="100%">
                    <BarChart data={movement}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="improved" fill="var(--chart-3)" name="Improved" />
                      <Bar dataKey="declined" fill="var(--color-danger)" name="Declined" />
                      <Bar dataKey="unchanged" fill="var(--color-text-muted)" name="Stable" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState description="Movement trends appear after ranking history is available." title="No movement data" />}
              </Panel>

              <Panel title="Average ranking">
                {ranking.length ? (
                  <ResponsiveContainer height={240} width="100%">
                    <LineChart data={ranking}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                      <XAxis dataKey="date" />
                      <YAxis reversed />
                      <Tooltip content={<ChartTooltip />} />
                      <Line dataKey="averagePosition" name="Average position" stroke="var(--color-warning)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState description="Average ranking appears after keyword measurements are recorded." title="No ranking trend" />}
              </Panel>

              <Panel title="Share of voice">
                {dashboard.shareOfVoice?.length ? (
                  <ResponsiveContainer height={240} width="100%">
                    <BarChart data={dashboard.shareOfVoice}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="share" fill="var(--chart-3)" name="Share %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState description="Add competitors to estimate comparative visibility." icon={Radar} title="No share of voice yet" />}
              </Panel>
            </section>
          ) : null}

          {activeTab === "keywords" ? (
            <section className="seo-grid lower">
              <Panel title="Ranking summary">
                <div className="movement-list">
                  <span>Improved <strong>{kpis.rankingMovement.improved}</strong></span>
                  <span>Declined <strong>{kpis.rankingMovement.declined}</strong></span>
                  <span>Stable <strong>{kpis.rankingMovement.unchanged}</strong></span>
                  <span>Top 3 <strong>{kpis.rankingMovement.top3}</strong></span>
                  <span>Top 10 <strong>{kpis.rankingMovement.top10}</strong></span>
                  <span>Top 100 <strong>{kpis.rankingMovement.top100}</strong></span>
                </div>
              </Panel>
              <Panel actions={<Link className="panel-link" to="/keywords">Manage keywords</Link>} title="Top ranking keywords">
                <DataTable caption="Top keywords" columns={keywordColumns} empty={<EmptyState title="No keyword rankings" />} rows={dashboard.topKeywords} rowKey="keyword" />
              </Panel>
              <Panel title="Top pages">
                <DataTable caption="Top pages" columns={pageColumns} empty={<EmptyState title="No page metrics" />} rows={dashboard.topPages} rowKey="url" />
              </Panel>
              <Panel title="Keyword distribution">
                {(dashboard.trends.distribution ?? []).length ? (
                  <ResponsiveContainer height={240} width="100%">
                    <BarChart data={dashboard.trends.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                      <XAxis dataKey="bucket" />
                      <YAxis allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" fill="var(--chart-1)" name="Keywords" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState title="No distribution data" />}
              </Panel>
            </section>
          ) : null}

          {activeTab === "competitors" ? (
            <Panel
              actions={<Link className="panel-link" to="/websites">Manage competitors</Link>}
              description="Domains compared for share of voice and ranking coverage"
              title="Competitor research"
            >
              <DataTable
                caption="Competitors"
                columns={competitorColumns}
                empty={<EmptyState action={<Link className="panel-link" to="/websites">Add competitors</Link>} description="Add competitor domains on the website settings page to unlock comparative research." icon={Radar} title="No competitors tracked" />}
                rows={dashboard.competitors ?? []}
              />
            </Panel>
          ) : null}

          {activeTab === "backlinks" ? (
            <Panel description={`${kpis.backlinks} known backlinks for this website`} title="Backlink research">
              <DataTable
                caption="Backlinks"
                columns={backlinkColumns}
                empty={<EmptyState description="Backlinks appear when link discovery or demo data is available for this website." icon={Link2} title="No backlinks yet" />}
                rows={dashboard.backlinks ?? []}
              />
            </Panel>
          ) : null}
        </>
      ) : !isLoading && websiteId && error ? (
        <Panel><ErrorState action={<Button onClick={loadDashboard}>Try again</Button>} description={error} title="Performance unavailable" /></Panel>
      ) : null}
    </main>
  );
}
