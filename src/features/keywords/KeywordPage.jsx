import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "../auth/AuthProvider.jsx";
import { createKeyword, exportKeywords, fetchKeywordDashboard, generateRankings, importKeywords } from "./keywordApi.js";

const initialFilters = { q: "", intent: "", device: "", location: "" };
const initialKeyword = {
  keyword: "",
  searchVolume: "",
  difficulty: "",
  cpc: "",
  intent: "commercial",
  device: "desktop",
  location: "United States",
  language: "en",
  source: "manual",
};

function latestChartRows(keywords) {
  const selected = keywords[0];
  return (selected?.rankings ?? []).map((ranking) => ({
    date: new Date(ranking.recordedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    position: ranking.rankPosition,
  }));
}

export function KeywordPage() {
  const { accessToken } = useAuth();
  const [websiteId, setWebsiteId] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [keywordForm, setKeywordForm] = useState(initialKeyword);
  const [importCsv, setImportCsv] = useState("keyword,searchVolume,difficulty,cpc,intent,device,location,language\nseo agency,1200,42,3.2,commercial,desktop,United States,en");
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chartRows = useMemo(() => latestChartRows(dashboard?.keywords ?? []), [dashboard?.keywords]);

  async function run(action) {
    setError("");
    setIsLoading(true);
    try {
      await action();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDashboard(nextFilters = filters) {
    if (!websiteId) throw new Error("Website ID is required");
    setDashboard(await fetchKeywordDashboard({ accessToken, websiteId, filters: nextFilters }));
  }

  async function handleCreateKeyword(event) {
    event.preventDefault();
    await run(async () => {
      await createKeyword({ accessToken, websiteId, input: keywordForm });
      setKeywordForm(initialKeyword);
      await loadDashboard();
    });
  }

  async function handleExport() {
    await run(async () => {
      const csv = await exportKeywords({ accessToken, websiteId, filters });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `keywords-${websiteId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <main className="page-shell keyword-page">
      <header className="page-header">
        <span>Day 3 keyword intelligence</span>
        <h1>Keyword Research and Rank Tracking</h1>
        <p>Track keyword metrics, import lists, generate mock ranking history, and review movement summaries.</p>
      </header>

      <section className="keyword-toolbar" aria-label="Website and keyword filters">
        <label>
          Website ID
          <input onChange={(event) => setWebsiteId(event.target.value)} placeholder="website uuid" value={websiteId} />
        </label>
        <label>
          Search
          <input onChange={(event) => setFilters({ ...filters, q: event.target.value })} value={filters.q} />
        </label>
        <label>
          Intent
          <select onChange={(event) => setFilters({ ...filters, intent: event.target.value })} value={filters.intent}>
            <option value="">All</option>
            <option value="informational">Informational</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>
        </label>
        <label>
          Device
          <select onChange={(event) => setFilters({ ...filters, device: event.target.value })} value={filters.device}>
            <option value="">All</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
        </label>
        <button onClick={() => run(() => loadDashboard())} type="button">
          Load
        </button>
      </section>

      {error ? <p className="auth-error keyword-error">{error}</p> : null}

      <section className="keyword-summary" aria-label="Keyword movement summary">
        {[
          ["Total", dashboard?.summary.total ?? 0],
          ["Improved", dashboard?.summary.improved ?? 0],
          ["Declined", dashboard?.summary.declined ?? 0],
          ["Top 3", dashboard?.summary.top3 ?? 0],
          ["Top 10", dashboard?.summary.top10 ?? 0],
          ["Top 100", dashboard?.summary.top100 ?? 0],
        ].map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="keyword-workspace">
        <form className="keyword-form" onSubmit={handleCreateKeyword}>
          <h2>Add Keyword</h2>
          <input onChange={(event) => setKeywordForm({ ...keywordForm, keyword: event.target.value })} placeholder="keyword" required value={keywordForm.keyword} />
          <input onChange={(event) => setKeywordForm({ ...keywordForm, searchVolume: event.target.value })} placeholder="volume" type="number" value={keywordForm.searchVolume} />
          <input onChange={(event) => setKeywordForm({ ...keywordForm, difficulty: event.target.value })} placeholder="difficulty" type="number" value={keywordForm.difficulty} />
          <input onChange={(event) => setKeywordForm({ ...keywordForm, cpc: event.target.value })} placeholder="cpc" type="number" value={keywordForm.cpc} />
          <button disabled={isLoading} type="submit">Add</button>
        </form>

        <div className="keyword-chart" aria-label="Ranking history chart">
          <h2>Ranking History</h2>
          <ResponsiveContainer height={240} width="100%">
            <LineChart data={chartRows}>
              <XAxis dataKey="date" />
              <YAxis domain={[1, 100]} reversed />
              <Tooltip />
              <Line dataKey="position" dot={false} stroke="#1f6feb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="keyword-actions" aria-label="Keyword import export actions">
        <textarea onChange={(event) => setImportCsv(event.target.value)} value={importCsv} />
        <div>
          <button onClick={() => run(async () => { await importKeywords({ accessToken, websiteId, csv: importCsv }); await loadDashboard(); })} type="button">Import CSV</button>
          <button onClick={() => run(async () => { setDashboard(await generateRankings({ accessToken, websiteId, days: 30 })); })} type="button">Generate 30 Days</button>
          <button onClick={() => run(async () => { setDashboard(await generateRankings({ accessToken, websiteId, days: 90 })); })} type="button">Generate 90 Days</button>
          <button onClick={handleExport} type="button">Export CSV</button>
        </div>
      </section>

      <section className="keyword-table-wrap" aria-label="Keyword table">
        <table className="keyword-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Intent</th>
              <th>Volume</th>
              <th>Difficulty</th>
              <th>CPC</th>
              <th>Latest</th>
              <th>Movement</th>
            </tr>
          </thead>
          <tbody>
            {(dashboard?.keywords ?? []).map((keyword) => (
              <tr key={keyword.id}>
                <td>{keyword.keyword}</td>
                <td>{keyword.intent ?? "-"}</td>
                <td>{keyword.searchVolume ?? "-"}</td>
                <td>{keyword.difficulty ?? "-"}</td>
                <td>{keyword.cpc ?? "-"}</td>
                <td>{keyword.movement.latest ?? "-"}</td>
                <td>{keyword.movement.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
