import { useEffect, useState } from "react";
import { CheckCircle2, Download, FilePlus2, FileText, RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "../auth/AuthProvider.jsx";
import { approveReport, createReport, downloadReportPdf, fetchReport, fetchReports, generateReportPdf } from "./reportApi.js";

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { clientId: "", title: "", periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

function number(value) {
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

export function ReportsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultPeriod);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(callback) {
    setError(""); setNotice(""); setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function loadReports() {
    const response = await fetchReports();
    setReports(response.reports);
  }

  async function openReport(id) {
    setSelected((await fetchReport(id)).report);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(loadReports);
  }, []);

  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      const response = await createReport({ ...form, title: form.title || undefined });
      setSelected(response.report);
      setForm(defaultPeriod());
      await loadReports();
      setNotice("Draft report generated.");
    });
  }

  async function approve() {
    await run(async () => {
      const response = await approveReport(selected.id);
      setSelected(response.report);
      await loadReports();
      setNotice("Report approved and PDF generated.");
    });
  }

  const data = selected?.reportData;

  return (
    <main className="page-shell reports-page">
      <header className="page-header"><span>Day 9 reporting</span><h1>SEO Reports</h1><p>Generate frozen performance snapshots, review them internally, and publish approved PDFs to clients.</p></header>
      <div className="report-toolbar"><button disabled={isLoading} onClick={() => run(loadReports)} type="button"><RefreshCw size={16} /> Refresh</button></div>
      {error ? <p className="auth-error keyword-error">{error}</p> : null}{notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      <section className="report-layout">
        <aside className="report-sidebar">
          {canManage ? <form onSubmit={submit}><h2><FilePlus2 size={18} /> New Report</h2><input onChange={(event) => setForm({ ...form, clientId: event.target.value })} placeholder="Client ID" required value={form.clientId} /><input onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Report title (optional)" value={form.title} /><label>Period start<input onChange={(event) => setForm({ ...form, periodStart: event.target.value })} type="date" value={form.periodStart} /></label><label>Period end<input onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} type="date" value={form.periodEnd} /></label><button type="submit"><FilePlus2 size={16} /> Generate Draft</button></form> : null}
          <div className="report-list"><h2>Reports</h2>{reports.map((report) => <button key={report.id} onClick={() => run(() => openReport(report.id))} type="button"><strong>{report.title}</strong><span>{report.client.companyName}</span><span className={`report-status ${report.status}`}>{report.status}</span></button>)}</div>
        </aside>

        <section className="report-preview">
          {selected ? <>
            <header><div><span>{selected.client.companyName}</span><h2>{selected.title}</h2><p>{new Date(selected.periodStart).toLocaleDateString()} - {new Date(selected.periodEnd).toLocaleDateString()}</p></div><span className={`report-status ${selected.status}`}>{selected.status}</span></header>
            <p className="report-summary">{selected.summary}</p>
            <div className="report-kpis"><article><span>Organic Traffic</span><strong>{number(data.performance.organicTraffic)}</strong></article><article><span>Clicks</span><strong>{number(data.performance.clicks)}</strong></article><article><span>Keywords Improved</span><strong>{number(data.keywords.improved)}</strong></article><article><span>SEO Health</span><strong>{data.technicalHealth.averageScore}</strong></article><article><span>Completed Tasks</span><strong>{data.tasks.completed}</strong></article><article><span>New Backlinks</span><strong>{data.backlinks.newLinks}</strong></article></div>
            <div className="report-chart"><h3>Organic Performance</h3><ResponsiveContainer height={240} width="100%"><LineChart data={data.performance.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line dataKey="organicTraffic" stroke="#1f6feb" strokeWidth={2} /><Line dataKey="clicks" stroke="#178a58" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
            <div className="report-columns"><section><h3>Completed Work</h3>{data.tasks.completedTitles.map((title) => <p key={title}><CheckCircle2 size={15} />{title}</p>)}</section><section><h3>Recommendations</h3>{data.recommendations.map((item) => <p key={item}>{item}</p>)}</section></div>
            <div className="report-actions">
              {canManage ? <button onClick={() => run(async () => { const response = await generateReportPdf(selected.id); setSelected(response.report); setNotice("PDF generated."); })} type="button"><FileText size={16} /> Generate PDF</button> : null}
              {canManage && selected.status === "draft" ? <button onClick={approve} type="button"><CheckCircle2 size={16} /> Approve</button> : null}
              {selected.pdfUrl ? <button onClick={() => run(() => downloadReportPdf(selected.id, selected.title))} type="button"><Download size={16} /> Download PDF</button> : null}
            </div>
          </> : <div className="empty-report"><FileText size={32} /><p>Select a report to preview it.</p></div>}
        </section>
      </section>
    </main>
  );
}
