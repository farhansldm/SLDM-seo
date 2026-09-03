import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "../auth/AuthProvider.jsx";
import { fetchSeoDashboard } from "./seoDashboardApi.js";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Not synced";
}

function percent(value) {
  return `${Math.round(Number(value ?? 0) * 1000) / 10}%`;
}

export function SeoDashboardPage() {
  const { accessToken } = useAuth();
  const [websiteId, setWebsiteId] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadDashboard(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!websiteId) throw new Error("Website ID is required");
      setDashboard(await fetchSeoDashboard({ accessToken, websiteId }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  const kpis = dashboard?.kpis;

  return (
    <main className="page-shell seo-page">
      <header className="page-header">
        <span>Day 4 SEO command center</span>
        <h1>SEO Dashboard and Share of Voice</h1>
        <p>Review traffic, rankings, audit health, backlinks, tasks, top pages, and competitor visibility.</p>
      </header>

      <form className="seo-toolbar" onSubmit={loadDashboard}>
        <label>
          Website ID
          <input onChange={(event) => setWebsiteId(event.target.value)} placeholder="website uuid" value={websiteId} />
        </label>
        <button disabled={isLoading} type="submit">{isLoading ? "Loading" : "Load dashboard"}</button>
      </form>

      {error ? <p className="auth-error keyword-error">{error}</p> : null}

      {dashboard ? (
        <>
          <section className="freshness-strip" aria-label="Data freshness">
            <strong>{dashboard.website.domain}</strong>
            <span>{dashboard.client.companyName}</span>
            <span>{dashboard.freshness.label}</span>
            <span>Updated {formatDate(dashboard.freshness.lastUpdatedAt)}</span>
            <span>{dashboard.audience === "client" ? "Client-safe view" : "Internal view"}</span>
          </section>

          <section className="seo-kpis" aria-label="SEO KPI cards">
            <article><span>Organic Traffic</span><strong>{kpis.organicTraffic}</strong></article>
            <article><span>Clicks</span><strong>{kpis.clicks}</strong></article>
            <article><span>Impressions</span><strong>{kpis.impressions}</strong></article>
            <article><span>CTR</span><strong>{percent(kpis.ctr)}</strong></article>
            <article><span>Avg Position</span><strong>{kpis.averagePosition}</strong></article>
            <article><span>SEO Score</span><strong>{kpis.seoScore}</strong></article>
            <article><span>Backlinks</span><strong>{kpis.backlinks}</strong></article>
            <article><span>Open Tasks</span><strong>{kpis.tasks.open}</strong></article>
          </section>

          <section className="seo-grid">
            <div className="seo-panel">
              <h2>Traffic Trend</h2>
              <ResponsiveContainer height={240} width="100%">
                <LineChart data={dashboard.trends.traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="organicTraffic" stroke="#1f6feb" strokeWidth={2} />
                  <Line dataKey="clicks" stroke="#178a58" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="seo-panel">
              <h2>Ranking Trend</h2>
              <ResponsiveContainer height={240} width="100%">
                <LineChart data={dashboard.trends.ranking}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis reversed />
                  <Tooltip />
                  <Line dataKey="averagePosition" stroke="#b54708" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="seo-panel">
              <h2>Keyword Distribution</h2>
              <ResponsiveContainer height={240} width="100%">
                <BarChart data={dashboard.trends.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1f6feb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="seo-panel">
              <h2>Share of Voice</h2>
              <ResponsiveContainer height={240} width="100%">
                <BarChart data={dashboard.shareOfVoice}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="share" fill="#178a58" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="seo-grid lower">
            <div className="seo-panel">
              <h2>Movement</h2>
              <div className="movement-list">
                <span>Improved <strong>{kpis.rankingMovement.improved}</strong></span>
                <span>Declined <strong>{kpis.rankingMovement.declined}</strong></span>
                <span>Top 3 <strong>{kpis.rankingMovement.top3}</strong></span>
                <span>Top 10 <strong>{kpis.rankingMovement.top10}</strong></span>
                <span>Top 100 <strong>{kpis.rankingMovement.top100}</strong></span>
              </div>
            </div>

            <div className="seo-panel">
              <h2>Top Pages</h2>
              <table className="keyword-table">
                <thead>
                  <tr><th>URL</th><th>Traffic</th><th>Clicks</th><th>Impressions</th></tr>
                </thead>
                <tbody>
                  {dashboard.topPages.map((page) => (
                    <tr key={page.url}><td>{page.url}</td><td>{page.organicTraffic}</td><td>{page.clicks}</td><td>{page.impressions}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
