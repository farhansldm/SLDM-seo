import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw } from "lucide-react";

import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { createTaskFromCheck, fetchAuditRun, fetchAuditRuns, runTechnicalAudit, setAuditCheckResolution } from "./auditApi.js";

function flattenChecks(run) {
  return (run?.crawledUrls ?? []).flatMap((url) => (url.checks ?? []).map((check) => ({ ...check, url: url.url, statusCode: url.statusCode })));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function TechnicalAuditPage() {
  const { selectedWebsite, websiteId } = useWorkspace();
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [severity, setSeverity] = useState("all");
  const [progress, setProgress] = useState("");

  async function action(callback) {
    setError("");
    setNotice("");
    setIsLoading(true);
    try {
      await callback();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  }

  async function openRun(crawlRunId) {
    setSelected(await fetchAuditRun({ crawlRunId }));
  }

  async function loadRuns(openLatest = false) {
    if (!websiteId) throw new Error("Select a website from the workspace header first");
    const response = await fetchAuditRuns({ websiteId });
    setRuns(response.runs);
    if (openLatest && response.runs[0]) await openRun(response.runs[0].id);
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setError("");
      setNotice("");
      setSelected(null);
      setRuns([]);
      if (!websiteId) return;
      setIsLoading(true);
      setProgress("Loading audit history");
      try {
        const response = await fetchAuditRuns({ websiteId });
        if (!active) return;
        setRuns(response.runs);
        if (response.runs[0]) {
          const detail = await fetchAuditRun({ crawlRunId: response.runs[0].id });
          if (active) setSelected(detail);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) {
          setIsLoading(false);
          setProgress("");
        }
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
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
    setProgress(`Starting crawl for ${selectedWebsite?.domain ?? "website"}`);
    const response = await runTechnicalAudit({ websiteId });
    if (response.queued) {
      setProgress("Audit queued");
      const completed = await waitForRun(response.crawlRun.id);
      if (completed) setSelected(completed);
      else setNotice("The audit is still running in the background. Refresh history shortly.");
    } else {
      setSelected(response);
    }
    await loadRuns(false);
  }

  async function createTask(checkId) {
    const response = await createTaskFromCheck({ checkId });
    setNotice(`Created task: ${response.task.title}`);
  }

  async function setResolution(checkId, resolved) {
    await setAuditCheckResolution({ checkId, resolved });
    const crawlRunId = selected?.run?.id ?? selected?.crawlRun?.id;
    if (crawlRunId) await openRun(crawlRunId);
    setNotice(resolved ? "Issue marked resolved." : "Issue reopened.");
  }

  const activeRun = selected?.run ?? selected?.crawlRun;
  const checks = useMemo(() => flattenChecks(activeRun), [activeRun]);
  const visibleChecks = severity === "all" ? checks : checks.filter((check) => check.severity === severity);

  return (
    <main className="page-shell audit-page">
      <header className="page-header">
        <span>Technical health</span>
        <h1>Technical SEO Audit Engine</h1>
        <p>Crawl real pages, inspect URL-level issues, compare crawl history, and convert findings into tasks.</p>
      </header>

      <section className="audit-toolbar">
        <div className="context-summary"><span>Active website</span><strong>{selectedWebsite?.domain ?? "Select a website from the header"}</strong></div>
        <button disabled={isLoading || !websiteId} onClick={() => action(() => loadRuns(true))} type="button"><RefreshCw size={16} /> Refresh history</button>
        <button disabled={isLoading || !websiteId} onClick={() => action(runAudit)} type="button"><Play size={16} /> {progress || "Run live audit"}</button>
      </section>

      {error ? <p className="auth-error keyword-error">{error}</p> : null}
      {notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      {activeRun ? (
        <section className="audit-run-meta">
          <span className={`run-status ${activeRun.status}`}>{activeRun.status}</span>
          <span>{activeRun.source === "live" ? "Live crawl" : "Demo crawl"}</span>
          <span>{activeRun.totalUrls ?? 0} pages</span>
          <span>{formatDate(activeRun.completedAt ?? activeRun.startedAt)}</span>
        </section>
      ) : null}

      <section className="audit-summary">
        {["score", "total", "critical", "high", "medium", "low"].map((key) => (
          <article key={key}>
            <span>{key === "score" ? "Score" : key}</span>
            <strong>{key === "score" ? selected?.summary?.score ?? "-" : selected?.summary?.checks?.[key] ?? 0}</strong>
          </article>
        ))}
      </section>

      {selected?.comparison ? (
        <section className="comparison-strip">
          <strong>Comparison</strong>
          <span>Score delta {selected.comparison.scoreDelta}</span>
          <span>Issue delta {selected.comparison.issueDelta}</span>
          <span>Critical delta {selected.comparison.criticalDelta}</span>
        </section>
      ) : null}

      <section className="audit-layout">
        <aside className="audit-history">
          <h2>Crawl History</h2>
          {!runs.length ? <p>No audits yet. Run the first live crawl for this website.</p> : null}
          {runs.map((run) => (
            <button className={activeRun?.id === run.id ? "active" : ""} key={run.id} onClick={() => action(() => openRun(run.id))} type="button">
              <strong>{formatDate(run.completedAt)}</strong>
              <span>{run.totalUrls} pages · {run.checks.total} issues · score {run.score ?? "pending"}</span>
              <small>{run.source === "live" ? "Live" : "Demo"} · {run.status}</small>
            </button>
          ))}
        </aside>

        <section className="audit-issues">
          <div className="audit-issues-header">
            <h2>Issues</h2>
            <label>Severity<select onChange={(event) => setSeverity(event.target.value)} value={severity}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
          </div>
          <table className="keyword-table">
            <thead><tr><th>Severity</th><th>Type</th><th>URL</th><th>Status</th><th>Recommendation</th><th>Actions</th></tr></thead>
            <tbody>
              {visibleChecks.map((check) => (
                <tr key={check.id ?? `${check.url}-${check.checkType}`}>
                  <td><span className={`severity ${check.severity}`}>{check.severity}</span></td>
                  <td>{check.checkType.replaceAll("_", " ")}</td>
                  <td>{check.url}</td>
                  <td>{check.status}</td>
                  <td>{check.recommendation}</td>
                  <td className="audit-row-actions">
                    <button disabled={!check.id} onClick={() => action(() => setResolution(check.id, check.status !== "resolved"))} type="button">{check.status === "resolved" ? "Reopen" : "Resolve"}</button>
                    <button disabled={!check.id} onClick={() => action(() => createTask(check.id))} type="button">Create task</button>
                  </td>
                </tr>
              ))}
              {!visibleChecks.length ? <tr><td colSpan="6">No issues match this view.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
