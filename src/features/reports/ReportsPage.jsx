import { useEffect, useState } from "react";
import { CheckCircle2, Download, FilePlus2, FileText, RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Alert, Badge, Button, ContextSummary, Dialog, EmptyState, ErrorState, Input, PageHeader, Panel, Skeleton, StatusIndicator, Toolbar, useToast } from "../../components/ui/index.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { approveReport, createReport, downloadReportPdf, fetchReport, fetchReports, generateReportPdf } from "./reportApi.js";

function defaultPeriod() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return { title: "", periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

function number(value) {
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

function statusTone(status) {
  return status === "approved" ? "success" : status === "draft" ? "warning" : "neutral";
}

function statusLabel(status) {
  if (status === "approved") return "Approved for client";
  if (status === "draft") return "Internal draft";
  return status;
}

export function ReportsPage() {
  const { user } = useAuth();
  const { clientId, selectedClient } = useWorkspace();
  const { notify } = useToast();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(defaultPeriod);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(callback) {
    setError("");
    setIsLoading(true);
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
    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchReports();
        if (!active) return;
        setReports(response.reports);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      if (!clientId) throw new Error("Select a client from the workspace header first");
      const response = await createReport({ ...form, clientId, title: form.title || undefined });
      setSelected(response.report);
      setForm(defaultPeriod());
      setBuilderOpen(false);
      await loadReports();
      notify("Draft report generated", "success");
    });
  }

  async function approve() {
    await run(async () => {
      const response = await approveReport(selected.id);
      setSelected(response.report);
      await loadReports();
      notify("Report approved and published for the client", "success");
    });
  }

  const data = selected?.reportData;

  return (
    <main className="page-shell reports-page">
      <PageHeader
        actions={canManage ? <Button icon={FilePlus2} onClick={() => setBuilderOpen(true)}>Build report</Button> : null}
        description="Generate frozen performance snapshots, review them internally, and publish approved PDFs to clients."
        eyebrow="Reporting and approvals"
        title="SEO reports"
      />

      <Toolbar label="Report library tools">
        <ContextSummary label="Active client" value={selectedClient?.companyName ?? "Select a client from the header"} />
        <Button disabled={isLoading} icon={RefreshCw} onClick={() => run(loadReports)} variant="secondary">Refresh library</Button>
      </Toolbar>

      {error ? <Alert tone="error" title="Report request failed">{error}</Alert> : null}

      <section className="report-layout">
        <aside className="report-sidebar">
          <Panel description={`${reports.length} report${reports.length === 1 ? "" : "s"}`} title="Report library">
            {isLoading && !reports.length ? <Skeleton lines={5} /> : reports.length ? (
              <div className="report-list">
                {reports.map((report) => (
                  <button className={selected?.id === report.id ? "active" : ""} key={report.id} onClick={() => run(() => openReport(report.id))} type="button">
                    <strong>{report.title}</strong>
                    <span>{report.client.companyName}</span>
                    <Badge tone={statusTone(report.status)}>{statusLabel(report.status)}</Badge>
                    <small>{new Date(report.createdAt).toLocaleDateString()}</small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                action={canManage ? <Button icon={FilePlus2} onClick={() => setBuilderOpen(true)}>Build first report</Button> : null}
                description="Draft reports stay internal until a manager approves them for the client portal."
                icon={FileText}
                title="No reports yet"
              />
            )}
          </Panel>
        </aside>

        <section className="report-preview">
          {isLoading && !selected ? <Panel><Skeleton lines={8} /></Panel> : selected ? (
            <Panel
              actions={<StatusIndicator label={statusLabel(selected.status)} status={statusTone(selected.status)} />}
              description={`${selected.client.companyName} · ${new Date(selected.periodStart).toLocaleDateString()} – ${new Date(selected.periodEnd).toLocaleDateString()}`}
              title={selected.title}
            >
              <Alert tone={selected.status === "approved" ? "success" : "warning"} title={selected.status === "approved" ? "Visible to the client" : "Internal draft"}>
                {selected.status === "approved"
                  ? "This report is approved and available in the client portal."
                  : "This draft is for agency review only. Clients cannot see it until approval."}
              </Alert>

              <p className="report-summary">{selected.summary}</p>

              <div className="report-kpis">
                <article><span>Organic traffic</span><strong>{number(data.performance.organicTraffic)}</strong></article>
                <article><span>Clicks</span><strong>{number(data.performance.clicks)}</strong></article>
                <article><span>Keywords improved</span><strong>{number(data.keywords.improved)}</strong></article>
                <article><span>SEO health</span><strong>{data.technicalHealth.averageScore}</strong></article>
                <article><span>Completed tasks</span><strong>{data.tasks.completed}</strong></article>
                <article><span>New backlinks</span><strong>{data.backlinks.newLinks}</strong></article>
              </div>

              <div className="report-chart">
                <h3>Organic performance</h3>
                <ResponsiveContainer height={240} width="100%">
                  <LineChart data={data.performance.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="organicTraffic" name="Organic traffic" stroke="var(--chart-1)" strokeWidth={2} />
                    <Line dataKey="clicks" name="Clicks" stroke="var(--chart-3)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="report-columns">
                <section>
                  <h3>Completed work</h3>
                  {data.tasks.completedTitles.map((title) => <p key={title}><CheckCircle2 size={15} />{title}</p>)}
                </section>
                <section>
                  <h3>Recommendations</h3>
                  {data.recommendations.map((item) => <p key={item}>{item}</p>)}
                </section>
              </div>

              <section className="report-approval-timeline">
                <h3>Approval history</h3>
                <ol>
                  <li><strong>Draft created</strong><span>{new Date(selected.createdAt).toLocaleString()}</span></li>
                  {selected.approvedAt ? <li><strong>Approved for client</strong><span>{new Date(selected.approvedAt).toLocaleString()}</span></li> : <li><strong>Awaiting approval</strong><span>Not published yet</span></li>}
                  {selected.pdfUrl ? <li><strong>PDF ready</strong><span>Download available</span></li> : <li><strong>PDF pending</strong><span>Generate after review</span></li>}
                </ol>
              </section>

              <div className="report-actions">
                {canManage ? <Button icon={FileText} onClick={() => run(async () => { const response = await generateReportPdf(selected.id); setSelected(response.report); notify("PDF generated", "success"); })} variant="secondary">Generate PDF</Button> : null}
                {canManage && selected.status === "draft" ? <Button icon={CheckCircle2} onClick={approve}>Approve for client</Button> : null}
                {selected.pdfUrl ? <Button icon={Download} onClick={() => run(() => downloadReportPdf(selected.id, selected.title))} variant="secondary">Download PDF</Button> : null}
              </div>
            </Panel>
          ) : error ? (
            <Panel><ErrorState action={<Button onClick={() => run(loadReports)}>Try again</Button>} description={error} title="Reports unavailable" /></Panel>
          ) : (
            <Panel><EmptyState description="Select a report from the library or build a new draft for the active client." icon={FileText} title="No report selected" /></Panel>
          )}
        </section>
      </section>

      <Dialog description={`Create a frozen performance snapshot for ${selectedClient?.companyName ?? "the active client"}.`} onClose={() => setBuilderOpen(false)} open={builderOpen} title="Build report">
        <form className="ui-form-stack" onSubmit={submit}>
          <ContextSummary label="Active client" value={selectedClient?.companyName ?? "Select a client from the header"} />
          <Input label="Report title" onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Optional title" value={form.title} />
          <div className="ui-form-grid">
            <Input label="Period start" onChange={(event) => setForm({ ...form, periodStart: event.target.value })} required type="date" value={form.periodStart} />
            <Input label="Period end" onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} required type="date" value={form.periodEnd} />
          </div>
          <Alert tone="info" title="Drafts stay internal">Clients only see a report after a manager approves it.</Alert>
          <div className="ui-confirm-actions">
            <Button onClick={() => setBuilderOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={!clientId || isLoading} type="submit">{isLoading ? "Generating..." : "Generate draft"}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
