import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, FileText, Globe2, Mail, NotebookPen, Plus, Search, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Alert, Badge, Button, Checkbox, DataTable, Dialog, EmptyState, ErrorState, Input, KpiCard, PageHeader, Panel, Select, Skeleton, Tabs, Textarea, Toolbar, useToast } from "../../components/ui/index.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { fetchReports } from "../reports/reportApi.js";
import { fetchTasks } from "../tasks/taskApi.js";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { addClientContact, addClientNote, assignClientUser, createClient, fetchTeamMembers } from "./clientApi.js";

const emptyClient = { companyName: "", status: "active", retainerAmount: "", retainerCycle: "monthly" };
const emptyContact = { name: "", email: "", roleTitle: "", isPrimary: false };
const tabs = [{ value: "overview", label: "Overview" }, { value: "contacts", label: "Contacts" }, { value: "websites", label: "Websites" }, { value: "team", label: "Team" }, { value: "notes", label: "Notes" }, { value: "tasks", label: "Tasks" }, { value: "reports", label: "Reports" }];

function money(value, cycle) {
  if (value == null) return "Not set";
  return `${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value))}/${cycle ?? "month"}`;
}

export function ClientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const { notify } = useToast();
  const canManage = ["admin", "manager"].includes(user?.role);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("name");
  const [activeTab, setActiveTab] = useState("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyClient);
  const [contact, setContact] = useState(emptyContact);
  const [note, setNote] = useState("");
  const [team, setTeam] = useState([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [recordsStatus, setRecordsStatus] = useState("loading");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selected = workspace.clients.find((client) => client.id === workspace.clientId) ?? null;

  useEffect(() => {
    let active = true;
    const loadRecords = async () => {
      setRecordsStatus("loading");
      try {
        const [teamData, taskData, reportData] = await Promise.all([
          canManage ? fetchTeamMembers() : Promise.resolve({ users: [] }),
          fetchTasks(),
          canManage ? fetchReports() : Promise.resolve({ reports: [] }),
        ]);
        if (!active) return;
        setTeam(teamData.users ?? []); setTasks(taskData.tasks ?? []); setReports(reportData.reports ?? []); setRecordsStatus("ready");
      } catch (requestError) { if (active) { setError(requestError.message); setRecordsStatus("error"); } }
    };
    loadRecords();
    return () => { active = false; };
  }, [canManage]);

  const visibleClients = useMemo(() => workspace.clients.filter((client) => {
    const haystack = [client.companyName, ...(client.contacts ?? []).flatMap((item) => [item.name, item.email])].filter(Boolean).join(" ").toLowerCase();
    return (status === "all" || client.status === status) && haystack.includes(query.toLowerCase());
  }).sort((a, b) => sort === "health" ? a.healthScore - b.healthScore : sort === "newest" ? new Date(b.createdAt) - new Date(a.createdAt) : a.companyName.localeCompare(b.companyName)), [query, sort, status, workspace.clients]);
  const selectedTasks = tasks.filter((task) => task.clientId === selected?.id);
  const selectedReports = reports.filter((report) => report.clientId === selected?.id);
  const unassignedTeam = team.filter((member) => !member.assignedClientIds.includes(selected?.id));

  async function execute(callback) {
    setError(""); setIsSaving(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsSaving(false); }
  }

  async function submitClient(event) {
    event.preventDefault();
    await execute(async () => {
      const response = await createClient({ ...form, retainerAmount: form.retainerAmount || null });
      await workspace.refreshClients(); workspace.setClientId(response.client.id); setForm(emptyClient); setCreateOpen(false); notify("Client workspace created", "success");
    });
  }

  async function saveContact(event) {
    event.preventDefault();
    await execute(async () => { await addClientContact(selected.id, contact); setContact(emptyContact); await workspace.refreshClients(); notify("Contact added", "success"); });
  }

  async function saveNote(event) {
    event.preventDefault();
    await execute(async () => { await addClientNote(selected.id, note); setNote(""); await workspace.refreshClients(); notify("Internal note added", "success"); });
  }

  async function assignMember() {
    await execute(async () => { await assignClientUser(selected.id, assigneeId); setAssigneeId(""); await workspace.refreshClients(); setTeam((current) => current.map((member) => member.id === assigneeId ? { ...member, assignedClientIds: [...member.assignedClientIds, selected.id] } : member)); notify("Team member assigned", "success"); });
  }

  const columns = [
    { key: "companyName", label: "Client", render: (client) => <button className="client-name-button" onClick={() => { workspace.setClientId(client.id); setActiveTab("overview"); }} type="button"><strong>{client.companyName}</strong><small>{client.contacts?.find((item) => item.isPrimary)?.email ?? client.contacts?.[0]?.email ?? "No primary contact"}</small></button> },
    { key: "status", label: "Status", render: (client) => <Badge tone={client.status === "active" ? "success" : client.status === "paused" ? "warning" : "danger"}>{client.status}</Badge> },
    { key: "health", label: "Health", render: (client) => <span className={`client-health client-health--${client.healthScore >= 80 ? "good" : client.healthScore >= 60 ? "watch" : "risk"}`}><i style={{ "--health": `${client.healthScore}%` }} />{client.healthScore}</span> },
    { key: "websites", label: "Websites", render: (client) => client.websites?.length ?? 0 },
    { key: "team", label: "Team", render: (client) => client.assignments?.length ?? 0 },
    { key: "retainer", label: "Retainer", render: (client) => money(client.retainerAmount, client.retainerCycle) },
  ];

  return <main className="page-shell clients-page">
    <PageHeader actions={canManage ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>New client</Button> : null} description="Monitor account health, contacts, delivery ownership, and work across every client." eyebrow="Agency CRM" title="Clients" />
    {workspace.status === "error" ? <ErrorState action={<Button onClick={workspace.refreshClients}>Try again</Button>} description="The client portfolio could not be loaded." title="Clients unavailable" /> : null}
    {error ? <Alert tone="error" title="Client request failed">{error}</Alert> : null}
    <section className="client-kpis">{workspace.status === "loading" ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} lines={2} />) : <><KpiCard label="Total clients" value={workspace.clients.length} /><KpiCard label="Active" value={workspace.clients.filter((client) => client.status === "active").length} /><KpiCard label="Needs attention" value={workspace.clients.filter((client) => client.healthScore < 70).length} /><KpiCard label="Managed websites" value={workspace.clients.reduce((total, client) => total + (client.websites?.length ?? 0), 0)} /></>}</section>
    <Toolbar label="Client filters"><Input label="Search clients" onChange={(event) => setQuery(event.target.value)} placeholder="Name or company" value={query} /><Select label="Status" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="churned">Churned</option></Select><Select label="Sort by" onChange={(event) => setSort(event.target.value)} value={sort}><option value="name">Name</option><option value="health">Lowest health</option><option value="newest">Newest</option></Select></Toolbar>

    <Panel className="client-table-panel" description={workspace.status === "loading" ? "Loading clients" : `${visibleClients.length} client${visibleClients.length === 1 ? "" : "s"}`} title="Client portfolio">{workspace.status === "loading" ? <Skeleton lines={6} /> : <DataTable caption="Agency clients" columns={columns} empty={<EmptyState action={canManage ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create client</Button> : null} description="Client accounts will appear here when they are available to you." icon={Building2} title="No clients found" />} rowClassName={(client) => client.id === selected?.id ? "is-selected" : undefined} rows={visibleClients} />}</Panel>

    {selected ? <section className="client-detail"><div className="client-detail-heading"><div><span className="client-avatar">{selected.companyName.slice(0, 2).toUpperCase()}</span><div><h2>{selected.companyName}</h2><p>{selected.websites?.length ?? 0} websites · {selected.assignments?.length ?? 0} team members</p></div></div><Badge tone={selected.status === "active" ? "success" : "warning"}>{selected.status}</Badge></div><Tabs active={activeTab} ariaLabel="Client detail sections" items={tabs.filter((item) => canManage || item.value !== "reports")} onChange={setActiveTab} /><div className="client-tab-content">
      {activeTab === "overview" ? <div className="client-overview-grid"><Panel title="Account summary"><dl className="detail-list"><div><dt>Health score</dt><dd>{selected.healthScore}/100</dd></div><div><dt>Retainer</dt><dd>{money(selected.retainerAmount, selected.retainerCycle)}</dd></div><div><dt>Primary contact</dt><dd>{selected.contacts?.find((item) => item.isPrimary)?.name ?? selected.contacts?.[0]?.name ?? "Not set"}</dd></div><div><dt>Open tasks</dt><dd>{selectedTasks.filter((task) => !["done", "cancelled"].includes(task.status)).length}</dd></div></dl></Panel><Panel title="Delivery risk"><div className="risk-summary"><span className={selected.healthScore >= 80 ? "good" : "watch"}>{selected.healthScore >= 80 ? "Healthy" : "Needs attention"}</span><p>{selected.websites?.length ? "Website delivery is active." : "Add a website to begin SEO delivery."}</p><p>{selectedTasks.some((task) => task.deadline && new Date(task.deadline) < new Date() && task.status !== "done") ? "There are overdue tasks requiring attention." : "No overdue work is recorded."}</p></div></Panel></div> : null}
      {activeTab === "contacts" ? <Panel actions={canManage ? <form className="inline-record-form" onSubmit={saveContact}><Input aria-label="Contact name" onChange={(event) => setContact({ ...contact, name: event.target.value })} placeholder="Name" required value={contact.name} /><Input aria-label="Contact email" onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="Email" required type="email" value={contact.email} /><Input aria-label="Contact role" onChange={(event) => setContact({ ...contact, roleTitle: event.target.value })} placeholder="Role" value={contact.roleTitle} /><Checkbox checked={contact.isPrimary} label="Primary" onChange={(event) => setContact({ ...contact, isPrimary: event.target.checked })} /><Button disabled={isSaving} size="sm" type="submit">Add</Button></form> : null} title="Contacts"><div className="record-list">{selected.contacts?.length ? selected.contacts.map((item) => <div key={item.id}><span className="record-icon"><Mail size={16} /></span><span><strong>{item.name ?? "Unnamed contact"}</strong><small>{item.email ?? "No email"}{item.roleTitle ? ` · ${item.roleTitle}` : ""}</small></span>{item.isPrimary ? <Badge tone="info">Primary</Badge> : null}</div>) : <EmptyState description="Add the people who receive updates and reports." icon={Mail} title="No contacts" />}</div></Panel> : null}
      {activeTab === "websites" ? <Panel actions={<Link className="panel-link" to="/websites">Manage websites <ArrowRight size={14} /></Link>} title="Websites"><div className="record-list">{selected.websites?.length ? selected.websites.map((site) => <div key={site.id}><span className="record-icon"><Globe2 size={16} /></span><button className="client-name-button" onClick={() => { workspace.setWebsiteId(site.id); navigate("/websites"); }} type="button"><strong>{site.domain}</strong><small>{site.cms ?? "Platform not set"} · {site.businessCategory ?? "Category not set"}</small></button><Badge tone={site.status === "active" ? "success" : "neutral"}>{site.status}</Badge></div>) : <EmptyState description="Connect the first website for this client." icon={Globe2} title="No websites" />}</div></Panel> : null}
      {activeTab === "team" ? <Panel actions={canManage ? <div className="team-assignment"><Select aria-label="Team member" onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}><option value="">Select team member</option>{unassignedTeam.map((member) => <option key={member.id} value={member.id}>{member.fullName ?? member.email} · {member.role}</option>)}</Select><Button disabled={!assigneeId || isSaving} onClick={assignMember} size="sm">Assign</Button></div> : null} title="Assigned team"><div className="record-list">{selected.assignments?.length ? selected.assignments.map((assignment) => <div key={assignment.id}><span className="record-icon"><Users size={16} /></span><span><strong>{assignment.user.fullName ?? assignment.user.email}</strong><small>{assignment.user.role.name} · {assignment.user.email}</small></span></div>) : <EmptyState description="Assign a manager or specialist to own delivery." icon={Users} title="No team assigned" />}</div></Panel> : null}
      {activeTab === "notes" ? <Panel description="Visible to agency staff only. These notes never appear in the client portal." title="Internal notes">{canManage ? <form className="note-form" onSubmit={saveNote}><Textarea label="Add an internal note" onChange={(event) => setNote(event.target.value)} placeholder="Context, decisions, or delivery risks..." required value={note} /><Button disabled={!note.trim() || isSaving} icon={NotebookPen} type="submit">Save note</Button></form> : null}<div className="note-timeline">{selected.notes?.length ? [...selected.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((item) => <article key={item.id}><span /><div><p>{item.note}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>) : <EmptyState description="Internal notes stay with the agency and are hidden from client users." icon={NotebookPen} title="No notes" />}</div></Panel> : null}
      {activeTab === "tasks" ? <Panel actions={<Link className="panel-link" to="/tasks">Open task workspace</Link>} title="Client tasks">{recordsStatus === "loading" ? <Skeleton lines={4} /> : recordsStatus === "error" ? <ErrorState description="Tasks for this client could not be loaded." title="Tasks unavailable" /> : <div className="record-list">{selectedTasks.length ? selectedTasks.slice(0, 10).map((task) => <div key={task.id}><span className="record-icon"><Search size={16} /></span><span><strong>{task.title}</strong><small>{task.priority} priority · {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}</small></span><Badge tone={task.status === "blocked" ? "danger" : task.status === "done" ? "success" : "neutral"}>{task.status.replaceAll("_", " ")}</Badge></div>) : <EmptyState description="Tasks linked to this client will appear here." title="No tasks" />}</div>}</Panel> : null}
      {activeTab === "reports" ? <Panel actions={<Link className="panel-link" to="/reports">Open report library</Link>} description="Drafts stay internal until a report is approved for the client." title="Reports">{recordsStatus === "loading" ? <Skeleton lines={4} /> : <div className="record-list">{selectedReports.length ? selectedReports.map((report) => <div key={report.id}><span className="record-icon"><FileText size={16} /></span><span><strong>{report.title}</strong><small>{new Date(report.createdAt).toLocaleDateString()}</small></span><Badge tone={report.status === "approved" ? "success" : "neutral"}>{report.status}</Badge></div>) : <EmptyState description="Generated reports for this client will appear here." icon={FileText} title="No reports" />}</div>}</Panel> : null}
    </div></section> : null}

    <Dialog description="Create an account for a new agency client." onClose={() => setCreateOpen(false)} open={createOpen} title="New client"><form className="ui-form-stack" onSubmit={submitClient}><Input label="Company name" onChange={(event) => setForm({ ...form, companyName: event.target.value })} required value={form.companyName} /><Select label="Status" onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}><option value="active">Active</option><option value="paused">Paused</option></Select><div className="ui-form-grid"><Input label="Retainer amount" min="0" onChange={(event) => setForm({ ...form, retainerAmount: event.target.value })} type="number" value={form.retainerAmount} /><Select label="Billing cycle" onChange={(event) => setForm({ ...form, retainerCycle: event.target.value })} value={form.retainerCycle}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></Select></div>{error ? <Alert tone="error">{error}</Alert> : null}<div className="ui-confirm-actions"><Button onClick={() => setCreateOpen(false)} variant="secondary">Cancel</Button><Button disabled={isSaving} type="submit">{isSaving ? "Creating..." : "Create client"}</Button></div></form></Dialog>
  </main>;
}
