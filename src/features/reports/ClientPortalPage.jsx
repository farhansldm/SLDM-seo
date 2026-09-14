import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Target } from "lucide-react";

import { useAuth } from "../auth/AuthProvider.jsx";
import { downloadReportPdf, fetchPortalDashboard } from "./reportApi.js";

export function ClientPortalPage() {
  const { accessToken } = useAuth();
  const [portal, setPortal] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    fetchPortalDashboard(accessToken).then(setPortal).catch((requestError) => setError(requestError.message));
  }, [accessToken]);

  if (error) return <main className="page-shell"><p className="auth-error">{error}</p></main>;
  if (!portal) return <main className="page-shell"><p>Loading client portal...</p></main>;

  return <main className="page-shell portal-page">
    <header className="page-header"><span>Client portal</span><h1>{portal.client.companyName}</h1><p>Your current organic performance, delivered work, priorities, and approved reports.</p></header>
    <section className="portal-kpis"><article><span>Organic Traffic</span><strong>{portal.performance.organicTraffic}</strong></article><article><span>Search Clicks</span><strong>{portal.performance.clicks}</strong></article><article><span>Keywords Improved</span><strong>{portal.keywordMovement.improved}</strong></article><article><span>Technical Health</span><strong>{portal.technicalHealth.averageScore}</strong></article></section>
    <section className="portal-grid"><div><h2><CheckCircle2 size={18} /> Completed Work</h2>{portal.completedWork.map((item) => <p key={item}>{item}</p>)}</div><div><h2><Target size={18} /> Current Priorities</h2>{portal.currentPriorities.map((item) => <p key={item.title}><strong>{item.title}</strong><span>{item.priority}</span></p>)}</div><div><h2>Recommendations</h2>{portal.recommendations.map((item) => <p key={item}>{item}</p>)}</div></section>
    <section className="approved-reports"><h2><FileText size={18} /> Approved Reports</h2>{portal.approvedReports.map((report) => <article key={report.id}><div><strong>{report.title}</strong><span>{new Date(report.approvedAt).toLocaleDateString()}</span></div><button onClick={() => downloadReportPdf(accessToken, report.id, report.title)} type="button"><Download size={16} /> Download</button></article>)}</section>
  </main>;
}
