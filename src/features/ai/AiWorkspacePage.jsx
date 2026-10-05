import { useEffect, useState } from "react";
import { ArrowLeft, Check, Clock3, RefreshCw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider.jsx";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { fetchAiHistory, fetchAiWorkflows, generateAiResearch, reviewAiResearch } from "./aiApi.js";

export function AiWorkspacePage() {
  const { user } = useAuth();
  const { clientId, selectedClient, selectedWebsite, websiteId } = useWorkspace();
  const canReview = ["admin", "manager"].includes(user?.role);
  const [workflows, setWorkflows] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: "keyword_expansion", instructions: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(callback) {
    setError(""); setNotice(""); setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function load() {
    const [workflowResponse, historyResponse] = await Promise.all([fetchAiWorkflows(), fetchAiHistory()]);
    setWorkflows(workflowResponse.workflows);
    setHistory(historyResponse.requests);
    setSelected((current) => current ?? historyResponse.requests[0] ?? null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(load);
  }, []);

  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      if (!clientId) throw new Error("Select a client from the workspace header first");
      const response = await generateAiResearch({ ...form, clientId, websiteId: websiteId || undefined });
      setSelected(response.request);
      setHistory((items) => [response.request, ...items]);
      setNotice("Research generated and queued for internal review.");
    });
  }

  async function review(reviewStatus) {
    await run(async () => {
      const response = await reviewAiResearch(selected.id, reviewStatus);
      setSelected(response.request);
      setHistory((items) => items.map((item) => item.id === response.request.id ? response.request : item));
      setNotice(`Output ${reviewStatus}.`);
    });
  }

  return (
    <main className="page-shell ai-page">
      <header className="page-header page-header-row">
        <div><span>Internal research workspace</span><h1>AI SEO Analyst</h1><p>Generate evidence-bound research from the client data already stored in the platform.</p></div>
        <Link className="icon-link" title="Back to dashboard" to="/"><ArrowLeft size={18} /><span>Dashboard</span></Link>
      </header>
      {error ? <p className="auth-error keyword-error">{error}</p> : null}{notice ? <p className="auth-notice keyword-error">{notice}</p> : null}

      <section className="ai-layout">
        <aside className="ai-controls">
          <form onSubmit={submit}>
            <h2><Sparkles size={18} /> New Research</h2>
            <div className="context-summary"><span>Workspace</span><strong>{selectedClient?.companyName ?? "No client"}{selectedWebsite ? ` · ${selectedWebsite.domain}` : ""}</strong></div>
            <label>Workflow<select onChange={(event) => setForm({ ...form, type: event.target.value })} value={form.type}>{workflows.map((workflow) => <option key={workflow.type} value={workflow.type}>{workflow.label}</option>)}</select></label>
            <label>Research direction<textarea maxLength={4000} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Focus, seed terms, audience, or reporting angle" rows={6} value={form.instructions} /></label>
            <button disabled={isLoading || !clientId} type="submit"><Send size={16} /> Generate</button>
          </form>
          <div className="ai-history">
            <header><h2><Clock3 size={18} /> History</h2><button disabled={isLoading} onClick={() => run(load)} title="Refresh history" type="button"><RefreshCw size={16} /></button></header>
            {history.map((item) => <button className={selected?.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item)} type="button"><strong>{workflows.find((workflow) => workflow.type === item.requestType)?.label ?? item.requestType}</strong><span>{item.client?.companyName}</span><small>{new Date(item.createdAt).toLocaleString()}</small></button>)}
          </div>
        </aside>

        <section className="ai-output">
          {selected ? <>
            <header><div><span>{selected.client?.companyName}</span><h2>{workflows.find((workflow) => workflow.type === selected.requestType)?.label ?? selected.requestType}</h2></div><div className={`ai-review-status ${selected.reviewStatus}`}><ShieldCheck size={15} />{selected.reviewStatus.replaceAll("_", " ")}</div></header>
            <div className="ai-meta"><span>Provider <strong>{selected.provider}</strong></span><span>Model <strong>{selected.model}</strong></span><span>Runtime <strong>{selected.durationMs ?? 0} ms</strong></span></div>
            {selected.status === "failed" ? <p className="auth-error">Generation failed. Review the server provider configuration.</p> : <pre>{selected.outputText}</pre>}
            {canReview && selected.status === "completed" && selected.reviewStatus === "pending" ? <div className="ai-review-actions"><button onClick={() => review("approved")} type="button"><Check size={16} /> Approve</button><button onClick={() => review("rejected")} type="button"><X size={16} /> Reject</button></div> : null}
          </> : <div className="empty-report"><Sparkles size={32} /><p>Generate or select research to review it.</p></div>}
        </section>
      </section>
    </main>
  );
}
