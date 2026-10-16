import { useEffect, useMemo, useState } from "react";
import { ClipboardPlus, Play, RefreshCw, ShieldCheck } from "lucide-react";

import { Alert, Badge, Button, ContextSummary, DataTable, EmptyState, KpiCard, PageHeader, Panel, Select, StatusIndicator, Toolbar, useToast } from "../../components/ui/index.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createTaskFromCheck, fetchAuditRun, fetchAuditRuns, runTechnicalAudit, setAuditCheckResolution } from "./auditApi.js";

function flattenChecks(run) {
  return (run?.crawledUrls ?? []).flatMap((url) => (url.checks ?? []).map((check) => ({ ...check, url: url.url, statusCode: url.statusCode })));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not available";
}

function statusTone(status) {
  return status === "completed" || status === "resolved" ? "success" : status === "failed" ? "danger" : "warning";
}

function severityTone(severity) {
  return severity === "critical" ? "danger" : severity === "high" || severity === "medium" ? "warning" : "info";
}

export function TechnicalAuditPage() {
  const { selectedWebsite, websiteId } = useWorkspace();
  const { notify } = useToast();
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [severity, setSeverity] = useState("all");
  const [progress, setProgress] = useState("");

  async function action(callback) {
    setError("");
    setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); setProgress(""); }
  }

  async function openRun(crawlRunId) { setSelected(await fetchAuditRun({ crawlRunId })); }

  async function loadRuns(openLatest = false) {
    if (!websiteId) throw new Error("Select a website from the workspace header first");
    const response = await fetchAuditRuns({ websiteId });
    setRuns(response.runs);
    if (openLatest && response.runs[0]) await openRun(response.runs[0].id);
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setError(""); setSelected(null); setRuns([]);
      if (!websiteId) return;
      setIsLoading(true); setProgress("Loading audit history");
      try {
        const response = await fetchAuditRuns({ websiteId });
        if (!active) return;
        setRuns(response.runs);
        if (response.runs[0]) {
          const detail = await fetchAuditRun({ crawlRunId: response.runs[0].id });
          if (active) setSelected(detail);
        }
      } catch (requestError) { if (active) setError(requestError.message); } finally { if (active) { setIsLoading(false); setProgress(""); } }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [websiteId]);

  async function waitForRun(crawlRunId) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      const detail = await fetchAuditRun({ crawlRunId });
      const status = detail.run?.status;
      if (status === "completed") return detail;
      if (status === "failed") throw new Error("The crawl failed. Confirm the website is publicly accessible and try again.");
      setProgress(`Crawling ${selectedWebsite?.domain ?? "website"}`);
    }
    return null;
  }

  async function runAudit() {
    if (!websiteId) throw new Error("Select a website from the workspace header first");
    setProgress(`Starting ${selectedWebsite?.domain ?? "website"}`);
    const response = await runTechnicalAudit({ websiteId });
    if (response.queued) {
      setProgress("Audit queued");
      const completed = await waitForRun(response.crawlRun.id);
      if (completed) { setSelected(completed); notify("Technical audit completed", "success"); }
      else notify("The audit is still running in the background", "info");
    } else { setSelected(response); notify("Technical audit completed", "success"); }
    await loadRuns(false);
  }

  async function createTask(checkId) {
    const response = await createTaskFromCheck({ checkId });
    notify(`Created task: ${response.task.title}`, "success");
  }

  async function setResolution(checkId, resolved) {
    await setAuditCheckResolution({ checkId, resolved });
    const crawlRunId = selected?.run?.id ?? selected?.crawlRun?.id;
    if (crawlRunId) await openRun(crawlRunId);
    notify(resolved ? "Issue marked resolved" : "Issue reopened", "success");
  }

  const activeRun = selected?.run ?? selected?.crawlRun;
  const checks = useMemo(() => flattenChecks(activeRun), [activeRun]);
  const visibleChecks = severity === "all" ? checks : checks.filter((check) => check.severity === severity);
  const columns = [
    { key: "severity", label: "Severity", render: (check) => <Badge tone={severityTone(check.severity)}>{check.severity}</Badge> },
    { key: "checkType", label: "Issue", render: (check) => check.checkType.replaceAll("_", " ") },
    { key: "url", label: "URL", render: (check) => <span className="audit-url" title={check.url}>{check.url}</span> },
    { key: "status", label: "Status", render: (check) => <StatusIndicator label={check.status} status={statusTone(check.status)} /> },
    { key: "recommendation", label: "Recommendation" },
    { key: "actions", label: "Actions", render: (check) => <div className="audit-row-actions"><Button disabled={!check.id} onClick={() => action(() => setResolution(check.id, check.status !== "resolved"))} size="sm" variant="secondary">{check.status === "resolved" ? "Reopen" : "Resolve"}</Button><Button disabled={!check.id} icon={ClipboardPlus} onClick={() => action(() => createTask(check.id))} size="sm">Task</Button></div> },
  ];

  return (
    <main className="page-shell audit-page">
      <PageHeader description="Crawl pages, prioritize technical problems, and turn findings into accountable work." eyebrow="Technical health" title="Site audits" />

      <Toolbar label="Audit controls">
        <ContextSummary label="Active website" value={selectedWebsite?.domain ?? "Select a website from the header"} />
        <Button disabled={isLoading || !websiteId} icon={RefreshCw} onClick={() => action(() => loadRuns(true))} variant="secondary">Refresh history</Button>
        <Button disabled={isLoading || !websiteId} icon={Play} onClick={() => action(runAudit)}>{progress || "Run live audit"}</Button>
      </Toolbar>

      {error ? <Alert tone="error" title="Audit request failed">{error}</Alert> : null}

      {activeRun ? <section className="audit-run-meta"><StatusIndicator label={activeRun.status} status={statusTone(activeRun.status)} /><Badge tone={activeRun.source === "live" ? "success" : "neutral"}>{activeRun.source === "live" ? "Live crawl" : "Demo crawl"}</Badge><span>{activeRun.totalUrls ?? 0} pages</span><span>{formatDate(activeRun.completedAt ?? activeRun.startedAt)}</span></section> : null}

      <section className="audit-summary">
        {["score", "total", "critical", "high", "medium", "low"].map((key) => <KpiCard key={key} label={key === "score" ? "Health score" : key} value={key === "score" ? selected?.summary?.score ?? "-" : selected?.summary?.checks?.[key] ?? 0} />)}
      </section>

      {selected?.comparison ? <section className="comparison-strip"><strong>Compared with previous crawl</strong><span>Score {selected.comparison.scoreDelta > 0 ? "+" : ""}{selected.comparison.scoreDelta}</span><span>Issues {selected.comparison.issueDelta > 0 ? "+" : ""}{selected.comparison.issueDelta}</span><span>Critical {selected.comparison.criticalDelta > 0 ? "+" : ""}{selected.comparison.criticalDelta}</span></section> : null}

      <section className="audit-layout">
        <Panel className="audit-history" title="Crawl history">
          {!runs.length ? <EmptyState description="Run the first crawl to establish this website's technical baseline." icon={ShieldCheck} title="No audits yet" /> : runs.map((run) => <button className={activeRun?.id === run.id ? "active" : ""} key={run.id} onClick={() => action(() => openRun(run.id))} type="button"><strong>{formatDate(run.completedAt)}</strong><span>{run.totalUrls} pages · {run.checks.total} issues · score {run.score ?? "pending"}</span><small>{run.source === "live" ? "Live" : "Demo"} · {run.status}</small></button>)}
        </Panel>

        <Panel actions={<Select aria-label="Filter audit issues by severity" onChange={(event) => setSeverity(event.target.value)} value={severity}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>} className="audit-issues" description={`${visibleChecks.length} issue${visibleChecks.length === 1 ? "" : "s"} in this view`} title="Issues">
          <DataTable caption="Technical audit issues" columns={columns} empty={<EmptyState description="Run an audit or change the severity filter to review findings." title="No matching issues" />} rowKey={(check) => check.id ?? `${check.url}-${check.checkType}`} rows={visibleChecks} />
        </Panel>
      </section>
    </main>
  );
}
