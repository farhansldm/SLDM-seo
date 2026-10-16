import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Download, Minus, Play, RefreshCw, Search, Upload } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, Badge, Button, ContextSummary, DataTable, Dialog, EmptyState, ErrorState, Input, KpiCard, PageHeader, Panel, Select, Skeleton, StatusIndicator, Tabs, Textarea, Toolbar, useToast } from "../../components/ui/index.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createKeyword, exportKeywords, fetchKeywordDashboard, generateRankings, importKeywords, researchKeywords } from "./keywordApi.js";

const FILTER_STORAGE = "seo_keyword_filters";
const initialFilters = { q: "", intent: "", device: "", location: "", movement: "" };
const initialKeyword = { keyword: "", searchVolume: "", difficulty: "", cpc: "", intent: "commercial", device: "desktop", location: "United States", language: "en", source: "manual" };
const workspaceTabs = [
  { value: "tracked", label: "Tracked keywords" },
  { value: "research", label: "Research ideas" },
  { value: "bulk", label: "Import and export" },
];

function loadSavedFilters() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(FILTER_STORAGE) ?? "{}");
    return { ...initialFilters, ...saved };
  } catch {
    return initialFilters;
  }
}

function chartRowsFor(keyword, days) {
  const cutoff = days === "all" ? 0 : Date.now() - Number(days) * 86400000;
  return (keyword?.rankings ?? [])
    .filter((ranking) => days === "all" || new Date(ranking.recordedAt).getTime() >= cutoff)
    .map((ranking) => ({
      date: new Date(ranking.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      position: ranking.rankPosition,
    }));
}

function movementLabel(status) {
  if (status === "improved") return "Improved";
  if (status === "declined") return "Declined";
  return "Stable";
}

function MovementBadge({ status, change }) {
  const Icon = status === "improved" ? ArrowUpRight : status === "declined" ? ArrowDownRight : Minus;
  const tone = status === "improved" ? "success" : status === "declined" ? "danger" : "neutral";
  const delta = change == null || change === 0 ? "" : change > 0 ? ` +${change}` : ` ${change}`;
  return <Badge tone={tone}><Icon aria-hidden="true" size={13} />{movementLabel(status)}{delta}</Badge>;
}

function RankingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong><span>Position {payload[0].value}</span><small>Lower is better</small></div>;
}

export function KeywordPage() {
  const { selectedWebsite, websiteId } = useWorkspace();
  const { notify } = useToast();
  const [filters, setFilters] = useState(loadSavedFilters);
  const [activeTab, setActiveTab] = useState("tracked");
  const [keywordForm, setKeywordForm] = useState(initialKeyword);
  const [importCsv, setImportCsv] = useState("keyword,searchVolume,difficulty,cpc,intent,device,location,language\nseo agency,1200,42,3.2,commercial,desktop,United States,en");
  const [seed, setSeed] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedKeywordId, setSelectedKeywordId] = useState("");
  const [range, setRange] = useState("30");
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(action) {
    setError("");
    setIsLoading(true);
    try { await action(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function loadDashboard(nextFilters = filters) {
    if (!websiteId) return;
    const response = await fetchKeywordDashboard({ websiteId, filters: nextFilters });
    setDashboard(response);
    setSelectedKeywordId((current) => response.keywords.some((item) => item.id === current) ? current : response.keywords[0]?.id ?? "");
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setError("");
      setDashboard(null);
      setIdeas([]);
      if (!websiteId) return;
      setIsLoading(true);
      try {
        const response = await fetchKeywordDashboard({ websiteId, filters });
        if (!active) return;
        setDashboard(response);
        setSelectedKeywordId(response.keywords[0]?.id ?? "");
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
    // Initial load uses the saved filter snapshot; later changes apply through the toolbar action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

  useEffect(() => {
    window.localStorage.setItem(FILTER_STORAGE, JSON.stringify(filters));
  }, [filters]);

  const selectedKeyword = useMemo(() => dashboard?.keywords?.find((item) => item.id === selectedKeywordId) ?? dashboard?.keywords?.[0] ?? null, [dashboard, selectedKeywordId]);
  const chartRows = useMemo(() => chartRowsFor(selectedKeyword, range), [range, selectedKeyword]);
  const intentGroups = useMemo(() => {
    const groups = new Map();
    (dashboard?.keywords ?? []).forEach((keyword) => {
      const intent = keyword.intent || "unspecified";
      groups.set(intent, (groups.get(intent) ?? 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[1] - a[1]);
  }, [dashboard]);

  const visibleKeywords = useMemo(() => {
    const rows = dashboard?.keywords ?? [];
    if (!filters.movement) return rows;
    return rows.filter((keyword) => keyword.movement?.status === filters.movement);
  }, [dashboard, filters.movement]);

  const columns = [
    {
      key: "keyword",
      label: "Keyword",
      render: (row) => (
        <button className="keyword-select-button" onClick={() => { setSelectedKeywordId(row.id); setActiveTab("tracked"); }} type="button">
          <strong>{row.keyword}</strong>
          <small>{row.location || "Global"} · {row.device || "desktop"}</small>
        </button>
      ),
    },
    { key: "intent", label: "Intent", render: (row) => <Badge tone="info">{row.intent ?? "Unknown"}</Badge> },
    { key: "searchVolume", label: "Volume", render: (row) => row.searchVolume ?? "-" },
    { key: "difficulty", label: "Difficulty", render: (row) => row.difficulty ?? "-" },
    { key: "latest", label: "Position", render: (row) => row.movement?.latest ?? "-" },
    {
      key: "movement",
      label: "Movement",
      render: (row) => {
        const change = row.movement?.previous != null && row.movement?.latest != null ? row.movement.previous - row.movement.latest : null;
        return <MovementBadge change={change} status={row.movement?.status ?? "unchanged"} />;
      },
    },
  ];

  async function handleCreateKeyword(event) {
    event.preventDefault();
    await run(async () => {
      await createKeyword({ websiteId, input: keywordForm });
      setKeywordForm(initialKeyword);
      setAddOpen(false);
      await loadDashboard();
      notify("Keyword added to tracking", "success");
    });
  }

  async function trackIdea(idea) {
    await run(async () => {
      await createKeyword({
        websiteId,
        input: {
          keyword: idea.keyword,
          searchVolume: idea.searchVolume,
          difficulty: idea.difficulty,
          cpc: idea.cpc,
          intent: idea.intent,
          device: idea.device,
          location: idea.location,
          language: idea.language,
          source: idea.source,
        },
      });
      await loadDashboard();
      notify(`Tracking "${idea.keyword}"`, "success");
    });
  }

  async function handleExport() {
    await run(async () => {
      const csv = await exportKeywords({ websiteId, filters });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `keywords-${selectedWebsite?.domain ?? "export"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify("Keyword export downloaded", "success");
    });
  }

  return (
    <main className="page-shell keyword-page">
      <PageHeader
        actions={<Button disabled={!websiteId} icon={Search} onClick={() => setAddOpen(true)}>Add keyword</Button>}
        description="Research opportunities, track ranking movement, and manage keyword lists for the active website."
        eyebrow="Search intelligence"
        title="Keywords"
      />

      <Toolbar label="Keyword filters">
        <ContextSummary label="Active website" value={selectedWebsite?.domain ?? "Select a website from the header"} />
        <Input label="Search" onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Filter keywords" value={filters.q} />
        <Select label="Intent" onChange={(event) => setFilters({ ...filters, intent: event.target.value })} value={filters.intent}>
          <option value="">All intents</option>
          <option value="informational">Informational</option>
          <option value="commercial">Commercial</option>
          <option value="transactional">Transactional</option>
          <option value="navigational">Navigational</option>
        </Select>
        <Select label="Device" onChange={(event) => setFilters({ ...filters, device: event.target.value })} value={filters.device}>
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
        </Select>
        <Select label="Movement" onChange={(event) => setFilters({ ...filters, movement: event.target.value })} value={filters.movement}>
          <option value="">All movement</option>
          <option value="improved">Improved</option>
          <option value="declined">Declined</option>
          <option value="unchanged">Stable</option>
        </Select>
        <Button disabled={!websiteId || isLoading} icon={RefreshCw} onClick={() => run(() => loadDashboard())} variant="secondary">Apply filters</Button>
      </Toolbar>

      {!websiteId ? <Panel><EmptyState description="Choose a website in the workspace header to load keyword tracking." icon={Search} title="Select a website" /></Panel> : null}
      {error ? <Alert tone="error" title="Keyword request failed">{error}</Alert> : null}

      <section aria-label="Keyword movement summary" className="keyword-summary">
        {isLoading && !dashboard ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} lines={2} />) : (
          <>
            <KpiCard label="Tracked" value={dashboard?.summary?.total ?? 0} />
            <KpiCard changeTone="positive" label="Improved" value={dashboard?.summary?.improved ?? 0} />
            <KpiCard changeTone="negative" label="Declined" value={dashboard?.summary?.declined ?? 0} />
            <KpiCard label="Top 3" value={dashboard?.summary?.top3 ?? 0} />
            <KpiCard label="Top 10" value={dashboard?.summary?.top10 ?? 0} />
            <KpiCard label="Top 100" value={dashboard?.summary?.top100 ?? 0} />
          </>
        )}
      </section>

      {intentGroups.length ? (
        <section aria-label="Intent groups" className="keyword-intent-groups">
          {intentGroups.map(([intent, count]) => (
            <button
              aria-pressed={filters.intent === intent}
              key={intent}
              onClick={() => {
                const next = { ...filters, intent: filters.intent === intent ? "" : intent };
                setFilters(next);
                run(() => loadDashboard(next));
              }}
              type="button"
            >
              <strong>{intent}</strong>
              <span>{count} keywords</span>
            </button>
          ))}
        </section>
      ) : null}

      <Tabs active={activeTab} ariaLabel="Keyword workspaces" items={workspaceTabs} onChange={setActiveTab} />

      {activeTab === "tracked" ? (
        <section className="keyword-workspace">
          <Panel
            actions={(
              <Select aria-label="Ranking history range" onChange={(event) => setRange(event.target.value)} value={range}>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All history</option>
              </Select>
            )}
            description={selectedKeyword ? `Position history for ${selectedKeyword.keyword}` : "Select a keyword to review movement."}
            title="Ranking history"
          >
            {isLoading && !dashboard ? <Skeleton lines={6} /> : chartRows.length ? (
              <ResponsiveContainer height={240} width="100%">
                <LineChart data={chartRows}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, "dataMax + 5"]} reversed />
                  <Tooltip content={<RankingTooltip />} />
                  <Line dataKey="position" dot={false} name="Position" stroke="var(--chart-1)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState description="Generate ranking history or wait for the first measurements." title="No ranking history" />
            )}
            {selectedKeyword ? (
              <div className="keyword-chart-meta">
                <StatusIndicator label={selectedKeyword.source === "manual" ? "Manual tracking" : "Imported tracking"} status="info" />
                <span>Latest position {selectedKeyword.movement?.latest ?? "—"}</span>
                <MovementBadge
                  change={selectedKeyword.movement?.previous != null && selectedKeyword.movement?.latest != null ? selectedKeyword.movement.previous - selectedKeyword.movement.latest : null}
                  status={selectedKeyword.movement?.status ?? "unchanged"}
                />
              </div>
            ) : null}
          </Panel>

          <Panel className="keyword-table-wrap" description={`${visibleKeywords.length} tracked term${visibleKeywords.length === 1 ? "" : "s"}`} title="Tracked keywords">
            {isLoading && !dashboard ? <Skeleton lines={6} /> : error && !dashboard ? (
              <ErrorState action={<Button onClick={() => run(() => loadDashboard())}>Try again</Button>} description={error} title="Keywords unavailable" />
            ) : (
              <DataTable
                caption="Tracked keywords"
                columns={columns}
                empty={<EmptyState action={<Button icon={Search} onClick={() => setAddOpen(true)}>Add keyword</Button>} description="Add a keyword, import a CSV, or research ideas to begin tracking." title="No tracked keywords" />}
                rowClassName={(row) => row.id === selectedKeyword?.id ? "is-selected" : undefined}
                rows={visibleKeywords}
              />
            )}
          </Panel>
        </section>
      ) : null}

      {activeTab === "research" ? (
        <Panel description="Generate related opportunities from a seed term, then track the ones worth measuring." title="Keyword research">
          <form
            className="keyword-research-form"
            onSubmit={(event) => {
              event.preventDefault();
              run(async () => {
                const response = await researchKeywords({ seed, location: filters.location || selectedWebsite?.primaryCountry || "United States" });
                setIdeas(response.ideas ?? []);
                notify(`${response.ideas?.length ?? 0} ideas generated`, "success");
              });
            }}
          >
            <Input label="Seed term" onChange={(event) => setSeed(event.target.value)} placeholder="e.g. dental clinic SEO" required value={seed} />
            <Button disabled={!seed.trim() || isLoading} icon={Search} type="submit">Generate ideas</Button>
          </form>
          <div className="keyword-idea-grid">
            {ideas.length ? ideas.map((idea) => (
              <article key={idea.keyword}>
                <div>
                  <strong>{idea.keyword}</strong>
                  <small>{idea.group} · vol {idea.searchVolume} · diff {idea.difficulty}</small>
                </div>
                <Badge tone="info">{idea.intent}</Badge>
                <Button disabled={!websiteId || isLoading} onClick={() => trackIdea(idea)} size="sm">Track</Button>
              </article>
            )) : <EmptyState description="Enter a seed term to generate research ideas for this market." icon={Search} title="No research ideas yet" />}
          </div>
        </Panel>
      ) : null}

      {activeTab === "bulk" ? (
        <Panel className="keyword-actions" description="Paste a CSV list, generate ranking history, or export the current filtered view." title="Bulk tools">
          <Textarea aria-label="Keyword CSV data" onChange={(event) => setImportCsv(event.target.value)} value={importCsv} />
          <div className="keyword-action-buttons">
            <Button disabled={!websiteId || isLoading} icon={Upload} onClick={() => run(async () => { await importKeywords({ websiteId, csv: importCsv }); await loadDashboard(); notify("Keyword list imported", "success"); })}>Import CSV</Button>
            <Button disabled={!websiteId || isLoading} icon={Play} onClick={() => run(async () => { setDashboard(await generateRankings({ websiteId, days: 30 })); notify("30-day ranking history generated", "success"); })} variant="secondary">30-day history</Button>
            <Button disabled={!websiteId || isLoading} icon={Play} onClick={() => run(async () => { setDashboard(await generateRankings({ websiteId, days: 90 })); notify("90-day ranking history generated", "success"); })} variant="secondary">90-day history</Button>
            <Button disabled={!websiteId || isLoading} icon={Download} onClick={handleExport} variant="secondary">Export CSV</Button>
          </div>
        </Panel>
      ) : null}

      <Dialog description="Add one search term to the active website." onClose={() => setAddOpen(false)} open={addOpen} title="Add keyword">
        <form className="ui-form-stack" onSubmit={handleCreateKeyword}>
          <Input label="Keyword" onChange={(event) => setKeywordForm({ ...keywordForm, keyword: event.target.value })} placeholder="e.g. local SEO agency" required value={keywordForm.keyword} />
          <div className="ui-form-grid">
            <Input label="Volume" min="0" onChange={(event) => setKeywordForm({ ...keywordForm, searchVolume: event.target.value })} type="number" value={keywordForm.searchVolume} />
            <Input label="Difficulty" max="100" min="0" onChange={(event) => setKeywordForm({ ...keywordForm, difficulty: event.target.value })} type="number" value={keywordForm.difficulty} />
          </div>
          <div className="ui-form-grid">
            <Select label="Intent" onChange={(event) => setKeywordForm({ ...keywordForm, intent: event.target.value })} value={keywordForm.intent}>
              <option value="informational">Informational</option>
              <option value="commercial">Commercial</option>
              <option value="transactional">Transactional</option>
              <option value="navigational">Navigational</option>
            </Select>
            <Select label="Device" onChange={(event) => setKeywordForm({ ...keywordForm, device: event.target.value })} value={keywordForm.device}>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </Select>
          </div>
          <Input label="Location" onChange={(event) => setKeywordForm({ ...keywordForm, location: event.target.value })} value={keywordForm.location} />
          <div className="ui-confirm-actions">
            <Button onClick={() => setAddOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={isLoading || !websiteId} type="submit">{isLoading ? "Saving..." : "Add keyword"}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
