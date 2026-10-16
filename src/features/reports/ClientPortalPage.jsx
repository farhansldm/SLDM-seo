import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Target } from "lucide-react";

import { Alert, Badge, Button, EmptyState, ErrorState, KpiCard, PageHeader, Panel, Skeleton } from "../../components/ui/index.js";
import { downloadReportPdf, fetchPortalDashboard } from "./reportApi.js";

export function ClientPortalPage() {
  const [portal, setPortal] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchPortalDashboard();
        if (active) setPortal(response);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);

  if (error) {
    return (
      <main className="page-shell portal-page">
        <PageHeader description="Your current organic performance, delivered work, and approved reports." eyebrow="Client portal" title="Your SEO progress" />
        <Panel><ErrorState description={error} title="Portal unavailable" /></Panel>
      </main>
    );
  }

  if (isLoading || !portal) {
    return (
      <main className="page-shell portal-page">
        <PageHeader description="Your current organic performance, delivered work, and approved reports." eyebrow="Client portal" title="Your SEO progress" />
        <section className="portal-kpis"><Skeleton lines={2} /><Skeleton lines={2} /><Skeleton lines={2} /><Skeleton lines={2} /></section>
      </main>
    );
  }

  return (
    <main className="page-shell portal-page">
      <PageHeader
        description="A clear view of organic performance, completed work, current priorities, and approved reports."
        eyebrow="Client portal"
        title={portal.client.companyName}
      />

      <Alert tone="info" title="Client-safe workspace">
        This portal shows approved delivery and performance results only. Internal notes, AI drafts, and operational costs stay with your agency team.
      </Alert>

      <section aria-label="Performance summary" className="portal-kpis">
        <KpiCard label="Organic traffic" value={portal.performance.organicTraffic} />
        <KpiCard label="Search clicks" value={portal.performance.clicks} />
        <KpiCard changeTone="positive" label="Keywords improved" value={portal.keywordMovement.improved} />
        <KpiCard label="Technical health" value={portal.technicalHealth.averageScore} />
      </section>

      <section className="portal-grid">
        <Panel title="Completed work">
          {portal.completedWork?.length ? portal.completedWork.map((item) => (
            <p className="portal-list-item" key={item}><CheckCircle2 size={16} /><span>{item}</span></p>
          )) : <EmptyState description="Completed delivery will appear here as work is finished." icon={CheckCircle2} title="No completed work yet" />}
        </Panel>

        <Panel title="Current priorities">
          {portal.currentPriorities?.length ? portal.currentPriorities.map((item) => (
            <p className="portal-list-item" key={item.title}>
              <Target size={16} />
              <span><strong>{item.title}</strong><small>{item.priority} priority</small></span>
            </p>
          )) : <EmptyState description="Your agency will share the next priorities here." icon={Target} title="No active priorities" />}
        </Panel>

        <Panel title="Recommendations">
          {portal.recommendations?.length ? portal.recommendations.map((item) => (
            <p className="portal-list-item" key={item}><span>{item}</span></p>
          )) : <EmptyState description="Approved recommendations will appear after your next review." title="No recommendations yet" />}
        </Panel>
      </section>

      <Panel className="approved-reports" description="Only reports approved by your agency appear here." title="Approved reports">
        {portal.approvedReports?.length ? (
          <div className="portal-report-list">
            {portal.approvedReports.map((report) => (
              <article key={report.id}>
                <div>
                  <strong>{report.title}</strong>
                  <span>{new Date(report.approvedAt).toLocaleDateString()}</span>
                </div>
                <Badge tone="success">Approved</Badge>
                <Button icon={Download} onClick={() => downloadReportPdf(report.id, report.title)} size="sm" variant="secondary">Download</Button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState description="When your agency approves a report, you can download it here." icon={FileText} title="No approved reports yet" />
        )}
      </Panel>
    </main>
  );
}
