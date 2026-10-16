import { useMemo, useState } from "react";
import { Download, Play, RefreshCw, Upload } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, Badge, Button, ContextSummary, DataTable, EmptyState, Input, KpiCard, PageHeader, Panel, Select, Textarea, Toolbar, useToast } from "../../components/ui/index.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createKeyword, exportKeywords, fetchKeywordDashboard, generateRankings, importKeywords } from "./keywordApi.js";

const initialFilters = { q: "", intent: "", device: "", location: "" };
const initialKeyword = { keyword: "", searchVolume: "", difficulty: "", cpc: "", intent: "commercial", device: "desktop", location: "United States", language: "en", source: "manual" };

function latestChartRows(keywords) {
  const selected = keywords[0];
  return (selected?.rankings ?? []).map((ranking) => ({ date: new Date(ranking.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }), position: ranking.rankPosition }));
}

function movementTone(status) {
  return status === "improved" ? "success" : status === "declined" ? "danger" : "neutral";
}

export function KeywordPage() {
  const { selectedWebsite, websiteId } = useWorkspace();
  const { notify } = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [keywordForm, setKeywordForm] = useState(initialKeyword);
  const [importCsv, setImportCsv] = useState("keyword,searchVolume,difficulty,cpc,intent,device,location,language\nseo agency,1200,42,3.2,commercial,desktop,United States,en");
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chartRows = useMemo(() => latestChartRows(dashboard?.keywords ?? []), [dashboard?.keywords]);
  const columns = [
    { key: "keyword", label: "Keyword" },
    { key: "intent", label: "Intent", render: (row) => <Badge tone="info">{row.intent ?? "Unknown"}</Badge> },
    { key: "searchVolume", label: "Volume", render: (row) => row.searchVolume ?? "-" },
    { key: "difficulty", label: "Difficulty", render: (row) => row.difficulty ?? "-" },
    { key: "cpc", label: "CPC", render: (row) => row.cpc ?? "-" },
    { key: "latest", label: "Latest", render: (row) => row.movement.latest ?? "-" },
    { key: "movement", label: "Movement", render: (row) => <Badge tone={movementTone(row.movement.status)}>{row.movement.status}</Badge> },
  ];

  async function run(action) {
    setError("");
    setIsLoading(true);
    try { await action(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function loadDashboard(nextFilters = filters) {
    if (!websiteId) throw new Error("Select a website from the workspace header first");
    setDashboard(await fetchKeywordDashboard({ websiteId, filters: nextFilters }));
  }

  async function handleCreateKeyword(event) {
    event.preventDefault();
    await run(async () => {
      await createKeyword({ websiteId, input: keywordForm });
      setKeywordForm(initialKeyword);
      await loadDashboard();
      notify("Keyword added to tracking", "success");
    });
  }

  async function handleExport() {
    await run(async () => {
      const csv = await exportKeywords({ websiteId, filters });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `keywords-${websiteId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify("Keyword export downloaded", "success");
    });
  }

  return (
    <main className="page-shell keyword-page">
      <PageHeader description="Track search terms, review ranking movement, and manage keyword lists for the active website." eyebrow="Search intelligence" title="Keywords" />

      <Toolbar label="Keyword filters">
        <ContextSummary label="Active website" value={selectedWebsite?.domain ?? "Select a website from the header"} />
        <Input label="Search" onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Filter keywords" value={filters.q} />
        <Select label="Intent" onChange={(event) => setFilters({ ...filters, intent: event.target.value })} value={filters.intent}>
          <option value="">All intents</option><option value="informational">Informational</option><option value="commercial">Commercial</option><option value="transactional">Transactional</option><option value="navigational">Navigational</option>
        </Select>
        <Select label="Device" onChange={(event) => setFilters({ ...filters, device: event.target.value })} value={filters.device}>
          <option value="">All devices</option><option value="desktop">Desktop</option><option value="mobile">Mobile</option>
        </Select>
        <Button disabled={!websiteId || isLoading} icon={RefreshCw} onClick={() => run(() => loadDashboard())} variant="secondary">Refresh</Button>
      </Toolbar>

      {error ? <Alert tone="error" title="Keyword request failed">{error}</Alert> : null}

      <section className="keyword-summary" aria-label="Keyword movement summary">
        {[["Total", dashboard?.summary.total ?? 0], ["Improved", dashboard?.summary.improved ?? 0], ["Declined", dashboard?.summary.declined ?? 0], ["Top 3", dashboard?.summary.top3 ?? 0], ["Top 10", dashboard?.summary.top10 ?? 0], ["Top 100", dashboard?.summary.top100 ?? 0]].map(([label, value]) => <KpiCard key={label} label={label} value={value} />)}
      </section>

      <section className="keyword-workspace">
        <Panel title="Add keyword" description="Add one search term to this website.">
          <form className="ui-form-stack" onSubmit={handleCreateKeyword}>
            <Input label="Keyword" onChange={(event) => setKeywordForm({ ...keywordForm, keyword: event.target.value })} placeholder="e.g. local SEO agency" required value={keywordForm.keyword} />
            <div className="ui-form-grid">
              <Input label="Volume" min="0" onChange={(event) => setKeywordForm({ ...keywordForm, searchVolume: event.target.value })} type="number" value={keywordForm.searchVolume} />
              <Input label="Difficulty" max="100" min="0" onChange={(event) => setKeywordForm({ ...keywordForm, difficulty: event.target.value })} type="number" value={keywordForm.difficulty} />
            </div>
            <Input label="CPC" min="0" onChange={(event) => setKeywordForm({ ...keywordForm, cpc: event.target.value })} step="0.01" type="number" value={keywordForm.cpc} />
            <Button disabled={isLoading || !websiteId} type="submit">Add keyword</Button>
          </form>
        </Panel>

        <Panel description={dashboard?.keywords?.[0] ? `Position history for ${dashboard.keywords[0].keyword}` : "Load tracked keywords to view movement."} title="Ranking history">
          {chartRows.length ? <ResponsiveContainer height={240} width="100%"><LineChart data={chartRows}><XAxis dataKey="date" /><YAxis domain={[1, 100]} reversed /><Tooltip /><Line dataKey="position" dot={false} stroke="var(--chart-1)" strokeWidth={2} /></LineChart></ResponsiveContainer> : <EmptyState description="Ranking history appears after the first tracked measurements are available." title="No ranking history" />}
        </Panel>
      </section>

      <Panel className="keyword-actions" description="Paste a CSV list or manage ranking history and exports." title="Bulk tools">
        <Textarea aria-label="Keyword CSV data" onChange={(event) => setImportCsv(event.target.value)} value={importCsv} />
        <div className="keyword-action-buttons">
          <Button disabled={!websiteId || isLoading} icon={Upload} onClick={() => run(async () => { await importKeywords({ websiteId, csv: importCsv }); await loadDashboard(); notify("Keyword list imported", "success"); })}>Import CSV</Button>
          <Button disabled={!websiteId || isLoading} icon={Play} onClick={() => run(async () => { setDashboard(await generateRankings({ websiteId, days: 30 })); })} variant="secondary">30-day history</Button>
          <Button disabled={!websiteId || isLoading} icon={Play} onClick={() => run(async () => { setDashboard(await generateRankings({ websiteId, days: 90 })); })} variant="secondary">90-day history</Button>
          <Button disabled={!websiteId || isLoading} icon={Download} onClick={handleExport} variant="secondary">Export CSV</Button>
        </div>
      </Panel>

      <Panel className="keyword-table-wrap" description="Search metrics and latest movement for tracked terms." title="Tracked keywords">
        <DataTable caption="Tracked keywords" columns={columns} empty={<EmptyState description="Add a keyword or import a list to begin tracking this website." title="No tracked keywords" />} rows={dashboard?.keywords ?? []} />
      </Panel>
    </main>
  );
}
