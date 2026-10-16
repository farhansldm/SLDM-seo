import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, FileText, Globe2, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import { Alert, Badge, Button, EmptyState, ErrorState, KpiCard, PageHeader, Panel, Skeleton, StatusIndicator } from "../../components/ui/index.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { fetchSeoDashboard } from "../seo-dashboard/seoDashboardApi.js";
import { fetchAlerts, fetchTasks } from "../tasks/taskApi.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";

function dueLabel(value) {
  if (!value) return "No deadline";
  const date = new Date(value);
  const days = Math.ceil((date - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

function formatFreshness(value) {
  if (!value) return "No measurements yet";
  return `Updated ${new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

function movementSummary(movement) {
  if (!movement) return { change: "Select a website", tone: "neutral", value: "—" };
  const improved = movement.improved ?? 0;
  const declined = movement.declined ?? 0;
  return {
    change: `${improved} up · ${declined} down`,
    tone: declined > improved ? "negative" : improved > 0 ? "positive" : "neutral",
    value: `${movement.top10 ?? 0} top 10`,
  };
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [siteData, setSiteData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const requests = [fetchTasks(), ["admin", "manager"].includes(user?.role) ? fetchAlerts() : Promise.resolve({ alerts: [] }), workspace.websiteId ? fetchSeoDashboard({ websiteId: workspace.websiteId }) : Promise.resolve(null)];
        const [taskResponse, alertResponse, dashboardResponse] = await Promise.all(requests);
        if (!active) return;
        setTasks(taskResponse.tasks ?? []); setAlerts(alertResponse.alerts ?? []); setSiteData(dashboardResponse);
      } catch (requestError) { if (active) setError(requestError.message); } finally { if (active) setLoading(false); }
    };
    if (workspace.status !== "loading") load();
    return () => { active = false; };
  }, [user?.role, workspace.status, workspace.websiteId]);

  const canReviewAlerts = ["admin", "manager"].includes(user?.role);
  const workspaceLoading = workspace.status === "loading";
  const openTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status));
  const overdue = openTasks.filter((task) => task.deadline && new Date(task.deadline) < new Date());
  const dueTasks = [...openTasks].sort((a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity)).slice(0, 6);
  const clientRisks = [...workspace.clients].sort((a, b) => a.healthScore - b.healthScore).slice(0, 5);
  const recentActivity = useMemo(() => workspace.clients.flatMap((client) => (client.notes ?? []).map((note) => ({ id: note.id, client: client.companyName, text: note.note, date: note.createdAt }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5), [workspace.clients]);
  const visibility = movementSummary(siteData?.kpis?.rankingMovement);

  return <main className="page-shell agency-dashboard">
    <PageHeader actions={<div className="dashboard-header-actions"><Button icon={Search} onClick={() => navigate("/keywords")} variant="secondary">Research keywords</Button><Button icon={Globe2} onClick={() => navigate("/audits")}>Run an audit</Button></div>} description={`A focused view of delivery risk, active work, and search performance${workspace.selectedClient ? ` for ${workspace.selectedClient.companyName}` : ""}.`} eyebrow={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user?.fullName?.split(" ")[0] ?? "team"}`} title="Agency overview" />
    {workspace.status === "error" ? <ErrorState action={<Button onClick={workspace.refreshClients}>Try again</Button>} description="Client and website context could not be loaded." title="Workspace unavailable" /> : null}
    {error ? <Alert tone="error" title="Dashboard data could not be loaded">{error}</Alert> : null}

    <section className="dashboard-kpis" aria-label="Agency key metrics">
      {workspaceLoading || loading ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} lines={2} />) : <>
        <KpiCard label="Active clients" value={workspace.clients.filter((client) => client.status === "active").length} />
        <KpiCard label="Managed websites" value={workspace.clients.reduce((total, client) => total + (client.websites?.length ?? 0), 0)} />
        <KpiCard change={overdue.length ? `${overdue.length} overdue` : "On schedule"} changeTone={overdue.length ? "negative" : "positive"} label="Open tasks" value={openTasks.length} />
        <KpiCard change={visibility.change} changeTone={visibility.tone} label="Tracked visibility" value={visibility.value} />
      </>}
    </section>

    <section className="dashboard-grid dashboard-grid--primary">
      <Panel actions={workspace.websiteId ? <Link className="panel-link" to="/seo-dashboard">Full analysis <ArrowRight size={14} /></Link> : null} description={workspace.selectedWebsite?.domain ?? "Choose a website from the workspace header"} title="Search performance">
        {loading || workspaceLoading ? <Skeleton lines={5} /> : siteData ? <><div className="dashboard-performance"><div><span>SEO score</span><strong>{siteData.kpis?.seoScore ?? 0}</strong><small>out of 100</small></div><div className="dashboard-performance-metrics"><span><small>Organic traffic</small><strong>{siteData.kpis?.organicTraffic ?? 0}</strong></span><span><small>Average position</small><strong>{siteData.kpis?.averagePosition || "-"}</strong></span><span><small>Critical issues</small><strong>{siteData.kpis?.auditHealth?.criticalIssues ?? 0}</strong></span></div></div><div className="dashboard-freshness"><StatusIndicator label={siteData.freshness?.mode === "live" ? "Live workspace" : "Demo data"} status={siteData.freshness?.mode === "live" ? "success" : "warning"} /><span>{formatFreshness(siteData.freshness?.lastUpdatedAt)}</span></div></> : <EmptyState description="Add a website to begin collecting audits, rankings, and performance information." icon={Globe2} title="No active website" />}
      </Panel>

      <Panel actions={<Link className="panel-link" to="/tasks">All tasks <ArrowRight size={14} /></Link>} description="Work needing attention soonest" title="Delivery queue">
        {loading || workspaceLoading ? <Skeleton lines={5} /> : dueTasks.length ? <div className="dashboard-task-list">{dueTasks.map((task) => <Link key={task.id} to={`/tasks?task=${task.id}`}><span className={`priority-dot priority-dot--${task.priority}`} /><span><strong>{task.title}</strong><small>{task.client?.companyName ?? "Client"} · {dueLabel(task.deadline)}</small></span><Badge tone={task.status === "blocked" ? "danger" : "neutral"}>{task.status.replaceAll("_", " ")}</Badge></Link>)}</div> : <EmptyState description="There are no open tasks in this workspace." icon={CheckCircle2} title="Delivery is clear" />}
      </Panel>
    </section>

    <section className="dashboard-grid dashboard-grid--secondary">
      <Panel actions={<Link className="panel-link" to="/clients">Manage clients <ArrowRight size={14} /></Link>} description="Lowest health scores appear first" title="Client health">
        {workspaceLoading ? <Skeleton lines={5} /> : clientRisks.length ? <div className="client-health-list">{clientRisks.map((client) => <Link key={client.id} onClick={() => workspace.setClientId(client.id)} to="/clients"><span className="health-score">{client.healthScore}</span><span><strong>{client.companyName}</strong><small>{client.websites?.length ?? 0} websites · {client.assignments?.length ?? 0} team members</small></span><Badge tone={client.status === "active" ? "success" : client.status === "paused" ? "warning" : "danger"}>{client.status}</Badge></Link>)}</div> : <EmptyState description="Create the first client workspace to start delivery." icon={Users} title="No clients yet" />}
      </Panel>

      <Panel actions={<Link className="panel-link" to="/tasks">Open alerts <ArrowRight size={14} /></Link>} description={`${alerts.length} open alert${alerts.length === 1 ? "" : "s"}`} title="Alerts">
        {loading ? <Skeleton lines={4} /> : !canReviewAlerts ? <EmptyState description="Ranking and deadline alerts are reviewed by account managers." icon={AlertTriangle} title="Alerts stay with account leads" /> : alerts.length ? <div className="dashboard-alert-list">{alerts.slice(0, 5).map((item) => <div key={item.id}><AlertTriangle size={17} /><span><strong>{item.title}</strong><small>{item.severity} priority</small></span></div>)}</div> : <EmptyState description="Important ranking, audit, and deadline changes will appear here." icon={CheckCircle2} title="No open alerts" />}
      </Panel>

      <Panel description="Latest internal client notes" title="Recent activity">
        {workspaceLoading ? <Skeleton lines={4} /> : recentActivity.length ? <div className="dashboard-activity-list">{recentActivity.map((item) => <div key={item.id}><span /><p><strong>{item.client}</strong> {item.text}<small>{new Date(item.date).toLocaleDateString()}</small></p></div>)}</div> : <EmptyState description="Internal client notes will appear here. They stay inside the agency." icon={ClipboardList} title="No recent activity" />}
      </Panel>
    </section>

    <section className="dashboard-quick-actions" aria-label="Quick actions"><Link to="/clients"><Users size={18} /><span><strong>Clients</strong><small>Review health and contacts</small></span></Link><Link to="/websites"><Globe2 size={18} /><span><strong>Websites</strong><small>Manage settings and competitors</small></span></Link><Link to="/keywords"><Search size={18} /><span><strong>Keywords</strong><small>Track search opportunities</small></span></Link><Link to="/reports"><FileText size={18} /><span><strong>Reports</strong><small>Prepare client delivery</small></span></Link></section>
  </main>;
}
