import { useEffect, useMemo, useState } from "react";
import { Bell, Columns3, List, MessageSquare, Paperclip, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { Alert, Badge, Button, ContextSummary, Dialog, Drawer, EmptyState, ErrorState, Input, PageHeader, Panel, Select, Skeleton, StatusIndicator, Tabs, Textarea, Toolbar, useToast } from "../../components/ui/index.js";
import { fetchTeamMembers } from "../clients/clientApi.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import {
  addTaskAttachment,
  addTaskComment,
  createTask,
  deleteTask,
  fetchAlerts,
  fetchMyTasks,
  fetchNotifications,
  fetchTask,
  fetchTasks,
  fetchWorkload,
  readNotification,
  resolveAlert,
  updateTask,
} from "./taskApi.js";

const emptyTask = { assignedTo: "", title: "", category: "technical_seo", priority: "medium", status: "todo", deadline: "" };
const statuses = ["todo", "in_progress", "blocked", "done", "cancelled"];
const boardColumns = ["todo", "in_progress", "blocked", "done"];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "No deadline";
}

function dueLabel(value) {
  if (!value) return "No deadline";
  const days = Math.ceil((new Date(value) - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

function priorityTone(priority) {
  return priority === "urgent" || priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
}

function statusTone(status) {
  return status === "done" ? "success" : status === "blocked" ? "danger" : status === "in_progress" ? "info" : "neutral";
}

export function TasksPage() {
  const { user } = useAuth();
  const { clientId, selectedClient, selectedWebsite, websiteId } = useWorkspace();
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [view, setView] = useState(user?.role === "employee" ? "mine" : "list");
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [createOpen, setCreateOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [team, setTeam] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const viewTabs = [
    ...(canManage ? [{ value: "list", label: "List", icon: List }] : []),
    ...(canManage ? [{ value: "board", label: "Board", icon: Columns3 }] : []),
    { value: "mine", label: "My work", icon: Users },
    ...(canManage ? [{ value: "workload", label: "Workload", icon: Users }] : []),
    ...(canManage ? [{ value: "alerts", label: "Alerts", icon: Bell }] : []),
  ];

  async function run(callback) {
    setError("");
    setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function loadTasks(nextView = view) {
    const response = nextView === "mine" ? await fetchMyTasks() : await fetchTasks();
    setTasks(response.tasks);
    return response.tasks;
  }

  async function openTask(id) {
    const response = await fetchTask(id);
    setSelected(response.task);
    setAssigneeId(response.task.assignedTo ?? "");
  }

  async function loadInbox() {
    const response = await fetchNotifications();
    setNotifications(response.notifications);
    if (canManage) setAlerts((await fetchAlerts()).alerts);
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const requests = [
          user?.role === "employee" ? fetchMyTasks() : fetchTasks(),
          fetchNotifications(),
          canManage ? fetchAlerts() : Promise.resolve({ alerts: [] }),
          canManage ? fetchTeamMembers() : Promise.resolve({ users: [] }),
        ];
        const [taskData, notificationData, alertData, teamData] = await Promise.all(requests);
        if (!active) return;
        setTasks(taskData.tasks ?? []);
        setNotifications(notificationData.notifications ?? []);
        setAlerts(alertData.alerts ?? []);
        setTeam(teamData.users ?? []);
        const deepLink = searchParams.get("task");
        if (deepLink) {
          const detail = await fetchTask(deepLink);
          if (active) {
            setSelected(detail.task);
            setAssigneeId(detail.task.assignedTo ?? "");
          }
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [canManage, searchParams, user?.role]);

  const assignableTeam = useMemo(() => {
    if (!clientId) return team;
    return team.filter((member) => member.assignedClientIds?.includes(clientId));
  }, [clientId, team]);

  async function switchView(nextView) {
    setView(nextView);
    await run(async () => {
      if (nextView === "workload") setWorkload(await fetchWorkload());
      else if (nextView === "alerts") await loadInbox();
      else await loadTasks(nextView === "board" || nextView === "list" ? "list" : nextView);
    });
  }

  async function submitTask(event) {
    event.preventDefault();
    await run(async () => {
      if (!clientId) throw new Error("Select a client from the workspace header first");
      const response = await createTask({
        ...form,
        clientId,
        websiteId: websiteId || null,
        assignedTo: form.assignedTo || null,
        deadline: form.deadline || null,
      });
      setForm(emptyTask);
      setCreateOpen(false);
      notify("Task created", "success");
      await Promise.all([loadTasks(view === "mine" ? "mine" : "list"), loadInbox()]);
      if (response.task?.id) await openTask(response.task.id);
    });
  }

  async function changeStatus(status) {
    await run(async () => {
      const response = await updateTask(selected.id, { status });
      setSelected(response.task);
      notify("Task status updated", "success");
      await loadTasks(view === "mine" ? "mine" : "list");
    });
  }

  async function changeAssignee() {
    await run(async () => {
      const response = await updateTask(selected.id, { assignedTo: assigneeId || null });
      setSelected(response.task);
      notify(assigneeId ? "Task reassigned" : "Task unassigned", "success");
      await Promise.all([loadTasks(view === "mine" ? "mine" : "list"), loadInbox()]);
    });
  }

  async function addComment() {
    await run(async () => {
      await addTaskComment(selected.id, comment);
      setComment("");
      await openTask(selected.id);
      notify("Comment added", "success");
    });
  }

  async function addAttachment() {
    await run(async () => {
      await addTaskAttachment(selected.id, fileUrl);
      setFileUrl("");
      await openTask(selected.id);
      notify("Attachment added", "success");
    });
  }

  function closeDrawer() {
    setSelected(null);
    if (searchParams.has("task")) {
      const next = new URLSearchParams(searchParams);
      next.delete("task");
      setSearchParams(next, { replace: true });
    }
  }

  const boardGroups = useMemo(() => boardColumns.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status),
  })), [tasks]);

  return (
    <main className="page-shell tasks-page">
      <PageHeader
        actions={canManage ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>New task</Button> : null}
        description="Assign SEO work, track delivery, collaborate on tasks, and respond to deadlines."
        eyebrow="Agency operations"
        title="Tasks and alerts"
      />

      <Toolbar label="Task views">
        <ContextSummary label="Workspace" value={`${selectedClient?.companyName ?? "All clients"}${selectedWebsite ? ` · ${selectedWebsite.domain}` : ""}`} />
        <Tabs active={view} ariaLabel="Task views" items={viewTabs} onChange={switchView} />
        <Button
          disabled={isLoading}
          icon={RefreshCw}
          onClick={() => run(async () => {
            if (view === "workload") setWorkload(await fetchWorkload());
            else if (view === "alerts") await loadInbox();
            else await Promise.all([loadTasks(view === "mine" ? "mine" : "list"), loadInbox()]);
          })}
          variant="secondary"
        >
          Refresh
        </Button>
      </Toolbar>

      {error ? <Alert tone="error" title="Task request failed">{error}</Alert> : null}

      {view === "workload" ? (
        <section aria-label="Manager workload" className="workload-grid">
          {isLoading && !workload ? <Skeleton lines={5} /> : (
            <>
              {(workload?.workload ?? []).map((item) => (
                <article key={item.user.id}>
                  <strong>{item.user.fullName ?? item.user.email}</strong>
                  <span>{item.user.role}</span>
                  <dl>
                    <dt>Total</dt><dd>{item.total}</dd>
                    <dt>In progress</dt><dd>{item.inProgress}</dd>
                    <dt>Blocked</dt><dd>{item.blocked}</dd>
                    <dt>Overdue</dt><dd>{item.overdue}</dd>
                  </dl>
                </article>
              ))}
              <Panel description="Tasks waiting for an owner" title="Unassigned"><strong>{workload?.unassigned ?? 0}</strong></Panel>
            </>
          )}
        </section>
      ) : null}

      {view === "alerts" ? (
        <section className="task-inbox">
          <Panel title="Notifications">
            {notifications.length ? notifications.map((item) => (
              <button className={item.isRead ? "read" : ""} key={item.id} onClick={() => run(async () => { await readNotification(item.id); await loadInbox(); })} type="button">
                {item.message}
              </button>
            )) : <EmptyState description="Assignment and deadline notices will appear here." icon={Bell} title="No notifications" />}
          </Panel>
          <Panel title="Open alerts">
            {alerts.length ? alerts.map((item) => (
              <button key={item.id} onClick={() => run(async () => { await resolveAlert(item.id); await loadInbox(); notify("Alert resolved", "success"); })} type="button">
                <strong>{item.title}</strong>
                <span>{item.severity} priority</span>
              </button>
            )) : <EmptyState description="Ranking, audit, and deadline alerts will appear here." icon={Bell} title="No open alerts" />}
          </Panel>
        </section>
      ) : null}

      {view === "board" ? (
        <section className="task-board" aria-label="Task board">
          {isLoading && !tasks.length ? <Skeleton lines={6} /> : boardGroups.map((column) => (
            <Panel description={`${column.tasks.length} tasks`} key={column.status} title={column.status.replaceAll("_", " ")}>
              <div className="task-board-column">
                {column.tasks.length ? column.tasks.map((task) => (
                  <button key={task.id} onClick={() => run(() => openTask(task.id))} type="button">
                    <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                    <strong>{task.title}</strong>
                    <small>{task.client?.companyName ?? "Client"} · {dueLabel(task.deadline)}</small>
                  </button>
                )) : <EmptyState description="No tasks in this column." title="Empty" />}
              </div>
            </Panel>
          ))}
        </section>
      ) : null}

      {(view === "list" || view === "mine") ? (
        <Panel className="task-list-panel" description={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`} title={view === "mine" ? "My work" : "All tasks"}>
          {isLoading && !tasks.length ? <Skeleton lines={6} /> : error && !tasks.length ? (
            <ErrorState action={<Button onClick={() => run(() => loadTasks(view === "mine" ? "mine" : "list"))}>Try again</Button>} description={error} title="Tasks unavailable" />
          ) : tasks.length ? (
            <div className="task-list-modern">
              {tasks.map((task) => (
                <button className="task-list-row" key={task.id} onClick={() => run(() => openTask(task.id))} type="button">
                  <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
                  <span><strong>{task.title}</strong><small>{task.client?.companyName ?? "Client"}{task.website?.domain ? ` · ${task.website.domain}` : ""}</small></span>
                  <Badge tone={statusTone(task.status)}>{task.status.replaceAll("_", " ")}</Badge>
                  <span>{dueLabel(task.deadline)}</span>
                </button>
              ))}
            </div>
          ) : <EmptyState action={canManage ? <Button icon={Plus} onClick={() => setCreateOpen(true)}>Create task</Button> : null} description="Tasks linked to your workspace will appear here." title="No tasks in this view" />}
        </Panel>
      ) : null}

      <Drawer description={selected ? `${selected.client?.companyName ?? "Client"}${selected.website?.domain ? ` · ${selected.website.domain}` : ""}` : ""} onClose={closeDrawer} open={Boolean(selected)} title={selected?.title ?? "Task detail"}>
        {selected ? (
          <div className="task-drawer">
            <div className="task-drawer-meta">
              <Badge tone={priorityTone(selected.priority)}>{selected.priority}</Badge>
              <StatusIndicator label={selected.status.replaceAll("_", " ")} status={statusTone(selected.status)} />
              <span>{formatDate(selected.deadline)}</span>
            </div>

            <Select label="Status" onChange={(event) => changeStatus(event.target.value)} value={selected.status}>
              {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </Select>

            {canManage ? (
              <div className="task-assignee-row">
                <Select label="Assignee" onChange={(event) => setAssigneeId(event.target.value)} value={assigneeId}>
                  <option value="">Unassigned</option>
                  {assignableTeam.map((member) => <option key={member.id} value={member.id}>{member.fullName ?? member.email} · {member.role}</option>)}
                </Select>
                <Button onClick={changeAssignee} size="sm" variant="secondary">Update</Button>
              </div>
            ) : null}

            <section>
              <h3><MessageSquare size={16} /> Comments</h3>
              <div className="task-comments">
                {selected.comments?.length ? selected.comments.map((item) => (
                  <p key={item.id}><strong>{item.author?.fullName ?? item.author?.email ?? "User"}</strong>{item.comment}</p>
                )) : <EmptyState description="Internal discussion stays with the agency." title="No comments yet" />}
              </div>
              <Textarea label="Add a comment" onChange={(event) => setComment(event.target.value)} value={comment} />
              <Button disabled={!comment.trim() || isLoading} icon={MessageSquare} onClick={addComment} size="sm">Add comment</Button>
            </section>

            <section>
              <h3><Paperclip size={16} /> Attachments</h3>
              {selected.attachments?.length ? selected.attachments.map((item) => (
                <a href={item.fileUrl} key={item.id} rel="noreferrer" target="_blank">{item.fileUrl}</a>
              )) : <EmptyState description="Add reference URLs for briefs, sheets, or screenshots." title="No attachments" />}
              <Input label="Attachment URL" onChange={(event) => setFileUrl(event.target.value)} type="url" value={fileUrl} />
              <Button disabled={!fileUrl || isLoading} icon={Paperclip} onClick={addAttachment} size="sm">Add attachment</Button>
            </section>

            {canManage ? (
              <Button
                className="danger-button"
                icon={Trash2}
                onClick={() => run(async () => { await deleteTask(selected.id); closeDrawer(); await loadTasks(view === "mine" ? "mine" : "list"); notify("Task deleted", "success"); })}
                variant="danger"
              >
                Delete task
              </Button>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Dialog description={`Create delivery work for ${selectedClient?.companyName ?? "the active client"}.`} onClose={() => setCreateOpen(false)} open={createOpen} title="New task">
        <form className="ui-form-stack" onSubmit={submitTask}>
          <ContextSummary label="Workspace" value={`${selectedClient?.companyName ?? "Select a client"}${selectedWebsite ? ` · ${selectedWebsite.domain}` : ""}`} />
          <Input label="Title" onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} />
          <div className="ui-form-grid">
            <Select label="Priority" onChange={(event) => setForm({ ...form, priority: event.target.value })} value={form.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Select label="Category" onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}>
              <option value="technical_seo">Technical SEO</option>
              <option value="content">Content</option>
              <option value="links">Links</option>
              <option value="reporting">Reporting</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <Select label="Assignee" onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} value={form.assignedTo}>
            <option value="">Unassigned</option>
            {assignableTeam.map((member) => <option key={member.id} value={member.id}>{member.fullName ?? member.email} · {member.role}</option>)}
          </Select>
          <Input label="Deadline" onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="datetime-local" value={form.deadline} />
          <div className="ui-confirm-actions">
            <Button onClick={() => setCreateOpen(false)} variant="secondary">Cancel</Button>
            <Button disabled={!clientId || isLoading} type="submit">{isLoading ? "Creating..." : "Create task"}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
