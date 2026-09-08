import { useEffect, useState } from "react";
import { Bell, MessageSquare, Paperclip, Plus, RefreshCw, Trash2, Users } from "lucide-react";

import { useAuth } from "../auth/AuthProvider.jsx";
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

const emptyTask = { clientId: "", websiteId: "", assignedTo: "", title: "", category: "technical_seo", priority: "medium", status: "todo", deadline: "" };
const statuses = ["todo", "in_progress", "blocked", "done", "cancelled"];

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "No deadline";
}

export function TasksPage() {
  const { accessToken, user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager";
  const [view, setView] = useState(user?.role === "employee" ? "mine" : "all");
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyTask);
  const [comment, setComment] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [workload, setWorkload] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run(callback) {
    setError("");
    setNotice("");
    setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function loadTasks(nextView = view) {
    const response = nextView === "mine" ? await fetchMyTasks(accessToken) : await fetchTasks(accessToken);
    setTasks(response.tasks);
  }

  async function openTask(id) {
    const response = await fetchTask(accessToken, id);
    setSelected(response.task);
    setAssigneeId(response.task.assignedTo ?? "");
  }

  async function loadInbox() {
    const response = await fetchNotifications(accessToken);
    setNotifications(response.notifications);
    if (canManage) setAlerts((await fetchAlerts(accessToken)).alerts);
  }

  useEffect(() => {
    if (!accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(async () => { await Promise.all([loadTasks(view), loadInbox()]); });
    // Initial load follows the authenticated session; later refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function switchView(nextView) {
    setView(nextView);
    await run(async () => {
      if (nextView === "workload") setWorkload(await fetchWorkload(accessToken));
      else await loadTasks(nextView);
    });
  }

  async function submitTask(event) {
    event.preventDefault();
    await run(async () => {
      await createTask(accessToken, {
        ...form,
        websiteId: form.websiteId || null,
        assignedTo: form.assignedTo || null,
        deadline: form.deadline || null,
      });
      setForm(emptyTask);
      setNotice("Task created.");
      await Promise.all([loadTasks(view), loadInbox()]);
    });
  }

  async function changeStatus(status) {
    await run(async () => {
      const response = await updateTask(accessToken, selected.id, { status });
      setSelected(response.task);
      setNotice("Task status updated.");
      await loadTasks(view);
    });
  }

  async function changeAssignee() {
    await run(async () => {
      const response = await updateTask(accessToken, selected.id, { assignedTo: assigneeId || null });
      setSelected(response.task);
      setNotice(assigneeId ? "Task reassigned." : "Task unassigned.");
      await Promise.all([loadTasks(view), loadInbox()]);
    });
  }

  async function addComment() {
    await run(async () => {
      await addTaskComment(accessToken, selected.id, comment);
      setComment("");
      await openTask(selected.id);
      setNotice("Comment added.");
    });
  }

  async function addAttachment() {
    await run(async () => {
      await addTaskAttachment(accessToken, selected.id, fileUrl);
      setFileUrl("");
      await openTask(selected.id);
      setNotice("Attachment metadata added.");
    });
  }

  return (
    <main className="page-shell tasks-page">
      <header className="page-header">
        <span>Day 8 execution workspace</span>
        <h1>Tasks, Workload, and Alerts</h1>
        <p>Assign SEO work, track delivery, collaborate on tasks, and respond to deadlines.</p>
      </header>

      <nav className="task-tabs" aria-label="Task views">
        {canManage ? <button aria-pressed={view === "all"} onClick={() => switchView("all")} type="button">All Tasks</button> : null}
        <button aria-pressed={view === "mine"} onClick={() => switchView("mine")} type="button">My Tasks</button>
        {canManage ? <button aria-pressed={view === "workload"} onClick={() => switchView("workload")} type="button"><Users size={16} /> Workload</button> : null}
        <button disabled={isLoading} onClick={() => run(async () => { await Promise.all([view === "workload" ? fetchWorkload(accessToken).then(setWorkload) : loadTasks(view), loadInbox()]); })} title="Refresh current view" type="button"><RefreshCw size={16} /> Refresh</button>
      </nav>

      {error ? <p className="auth-error keyword-error">{error}</p> : null}
      {notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      {view === "workload" ? (
        <section className="workload-grid" aria-label="Manager workload">
          {(workload?.workload ?? []).map((item) => (
            <article key={item.user.id}><strong>{item.user.fullName ?? item.user.email}</strong><span>{item.user.role}</span><dl><dt>Total</dt><dd>{item.total}</dd><dt>In progress</dt><dd>{item.inProgress}</dd><dt>Blocked</dt><dd>{item.blocked}</dd><dt>Overdue</dt><dd>{item.overdue}</dd></dl></article>
          ))}
          <p>Unassigned tasks: <strong>{workload?.unassigned ?? 0}</strong></p>
        </section>
      ) : (
        <section className="task-layout">
          {canManage ? (
            <form className="task-form" onSubmit={submitTask}>
              <h2><Plus size={18} /> Create Task</h2>
              <input onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Task title" required value={form.title} />
              <input onChange={(event) => setForm({ ...form, clientId: event.target.value })} placeholder="Client ID" required value={form.clientId} />
              <input onChange={(event) => setForm({ ...form, websiteId: event.target.value })} placeholder="Website ID (optional)" value={form.websiteId} />
              <input onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} placeholder="Assignee user ID" value={form.assignedTo} />
              <input onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" value={form.category} />
              <select onChange={(event) => setForm({ ...form, priority: event.target.value })} value={form.priority}><option>low</option><option>medium</option><option>high</option><option>urgent</option></select>
              <input onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="datetime-local" value={form.deadline} />
              <button type="submit"><Plus size={16} /> Create</button>
            </form>
          ) : null}

          <section className="task-list">
            <h2>{view === "mine" ? "My Tasks" : "All Tasks"}</h2>
            {tasks.map((task) => (
              <button className="task-list-row" key={task.id} onClick={() => run(() => openTask(task.id))} type="button">
                <span className={`priority priority-${task.priority}`}>{task.priority}</span>
                <strong>{task.title}</strong>
                <span>{task.client.companyName}</span>
                <span>{task.status.replace("_", " ")}</span>
                <span>{formatDate(task.deadline)}</span>
              </button>
            ))}
            {!tasks.length ? <p>No tasks in this view.</p> : null}
          </section>

          <aside className="task-detail">
            <h2>Task Detail</h2>
            {selected ? (
              <>
                <strong>{selected.title}</strong><span>{selected.client.companyName}</span>
                <label>Status<select onChange={(event) => changeStatus(event.target.value)} value={selected.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                {canManage ? <><input onChange={(event) => setAssigneeId(event.target.value)} placeholder="Assignee user ID" value={assigneeId} /><button onClick={changeAssignee} type="button"><Users size={16} /> Update Assignee</button></> : null}
                <p>Deadline: {formatDate(selected.deadline)}</p>
                <div className="task-comments">{selected.comments.map((item) => <p key={item.id}><strong>{item.author?.fullName ?? item.author?.email ?? "User"}</strong>{item.comment}</p>)}</div>
                <textarea onChange={(event) => setComment(event.target.value)} placeholder="Internal comment" value={comment} />
                <button disabled={!comment.trim()} onClick={addComment} type="button"><MessageSquare size={16} /> Add Comment</button>
                <input onChange={(event) => setFileUrl(event.target.value)} placeholder="Attachment URL" type="url" value={fileUrl} />
                <button disabled={!fileUrl} onClick={addAttachment} type="button"><Paperclip size={16} /> Add Attachment</button>
                {selected.attachments.map((item) => <a href={item.fileUrl} key={item.id} rel="noreferrer" target="_blank">{item.fileUrl}</a>)}
                {canManage ? <button className="danger-button" onClick={() => run(async () => { await deleteTask(accessToken, selected.id); setSelected(null); await loadTasks(view); })} type="button"><Trash2 size={16} /> Delete Task</button> : null}
              </>
            ) : <p>Select a task.</p>}
          </aside>
        </section>
      )}

      <section className="task-inbox">
        <div><h2><Bell size={18} /> Notifications</h2>{notifications.map((item) => <button className={item.isRead ? "read" : ""} key={item.id} onClick={() => run(async () => { await readNotification(accessToken, item.id); await loadInbox(); })} type="button">{item.message}</button>)}</div>
        {canManage ? <div><h2>Open Alerts</h2>{alerts.map((item) => <button key={item.id} onClick={() => run(async () => { await resolveAlert(accessToken, item.id); await loadInbox(); })} type="button"><strong>{item.title}</strong><span>{item.severity}</span></button>)}</div> : null}
      </section>
    </main>
  );
}
