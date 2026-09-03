import { useState } from "react";

import { useAuth } from "../auth/AuthProvider.jsx";
import { createTaskFromCheck, fetchAuditRun, fetchAuditRuns, runTechnicalAudit } from "./auditApi.js";

function flattenChecks(run) {
  return (run?.crawledUrls ?? []).flatMap((url) => (url.checks ?? []).map((check) => ({ ...check, url: url.url, statusCode: url.statusCode })));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

export function TechnicalAuditPage() {
  const { accessToken } = useAuth();
  const [websiteId, setWebsiteId] = useState("");
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }

  async function loadRuns() {
    if (!websiteId) throw new Error("Website ID is required");
    const response = await fetchAuditRuns({ accessToken, websiteId });
    setRuns(response.runs);
  }

  async function runAudit() {
    if (!websiteId) throw new Error("Website ID is required");
    const response = await runTechnicalAudit({ accessToken, websiteId });
    setSelected(response);
    const history = await fetchAuditRuns({ accessToken, websiteId });
    setRuns(history.runs);
  }

  async function openRun(crawlRunId) {
    setSelected(await fetchAuditRun({ accessToken, crawlRunId }));
  }

  async function createTask(checkId) {
    const response = await createTaskFromCheck({ accessToken, checkId });
    setNotice(`Created task: ${response.task.title}`);
  }

  const checks = flattenChecks(selected?.run ?? selected?.crawlRun);

  return (
    <main className="page-shell audit-page">
      <header className="page-header">
        <span>Day 5 technical audit</span>
        <h1>Technical SEO Audit Engine</h1>
        <p>Run mock crawls, inspect URL-level issues, compare crawl history, and convert audit findings into tasks.</p>
      </header>

      <section className="audit-toolbar">
        <label>
          Website ID
          <input onChange={(event) => setWebsiteId(event.target.value)} placeholder="website uuid" value={websiteId} />
        </label>
        <button disabled={isLoading} onClick={() => action(loadRuns)} type="button">Load history</button>
        <button disabled={isLoading} onClick={() => action(runAudit)} type="button">Run audit</button>
      </section>

      {error ? <p className="auth-error keyword-error">{error}</p> : null}
      {notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      <section className="audit-summary">
        {["score", "total", "critical", "high", "medium", "low"].map((key) => (
          <article key={key}>
            <span>{key === "score" ? "Score" : key}</span>
            <strong>{key === "score" ? selected?.summary?.score ?? 0 : selected?.summary?.checks?.[key] ?? 0}</strong>
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
          {runs.map((run) => (
            <button key={run.id} onClick={() => action(() => openRun(run.id))} type="button">
              <strong>{formatDate(run.completedAt)}</strong>
              <span>{run.totalUrls} URLs · {run.checks.total} issues · score {run.score}</span>
            </button>
          ))}
        </aside>

        <section className="audit-issues">
          <h2>Issues</h2>
          <table className="keyword-table">
            <thead>
              <tr><th>Severity</th><th>Type</th><th>URL</th><th>Status</th><th>Recommendation</th><th>Action</th></tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id ?? `${check.url}-${check.checkType}`}>
                  <td><span className={`severity ${check.severity}`}>{check.severity}</span></td>
                  <td>{check.checkType}</td>
                  <td>{check.url}</td>
                  <td>{check.status}</td>
                  <td>{check.recommendation}</td>
                  <td><button onClick={() => action(() => createTask(check.id))} type="button">Create task</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
