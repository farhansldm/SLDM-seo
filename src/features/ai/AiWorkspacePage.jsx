import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, RefreshCw, Send, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";

import { Alert, Badge, Button, ContextSummary, EmptyState, ErrorState, PageHeader, Panel, Select, Skeleton, StatusIndicator, Textarea, Toolbar, useToast } from "../../components/ui/index.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useWorkspace } from "../workspace/WorkspaceProvider.jsx";
import { fetchAiHistory, fetchAiWorkflows, generateAiResearch, reviewAiResearch } from "./aiApi.js";

function reviewTone(status) {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "neutral";
}

function reviewCopy(request) {
  if (request.status === "failed") return { label: "Generation failed", status: "error", note: "This draft was not produced. Retry after checking provider configuration." };
  if (request.reviewStatus === "approved") return { label: "Approved for internal use", status: "success", note: "Approved research is still internal. Publish through client reports only." };
  if (request.reviewStatus === "rejected") return { label: "Rejected", status: "error", note: "This draft should not be used in client delivery." };
  return { label: "Pending review", status: "warning", note: "Treat this as an unreviewed AI draft. Do not send it to clients yet." };
}

export function AiWorkspacePage() {
  const { user } = useAuth();
  const { clientId, selectedClient, selectedWebsite, websiteId } = useWorkspace();
  const { notify } = useToast();
  const canReview = ["admin", "manager"].includes(user?.role);
  const [workflows, setWorkflows] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: "keyword_expansion", instructions: "" });
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(callback) {
    setError("");
    setIsLoading(true);
    try { await callback(); } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  async function load() {
    const [workflowResponse, historyResponse] = await Promise.all([fetchAiWorkflows(), fetchAiHistory()]);
    setWorkflows(workflowResponse.workflows);
    setHistory(historyResponse.requests);
    setSelected((current) => {
      if (!current) return historyResponse.requests[0] ?? null;
      return historyResponse.requests.find((item) => item.id === current.id) ?? historyResponse.requests[0] ?? null;
    });
  }

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError("");
      try {
        const [workflowResponse, historyResponse] = await Promise.all([fetchAiWorkflows(), fetchAiHistory()]);
        if (!active) return;
        setWorkflows(workflowResponse.workflows);
        setHistory(historyResponse.requests);
        setSelected(historyResponse.requests[0] ?? null);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);

  const visibleHistory = useMemo(() => {
    if (filter === "all") return history;
    if (filter === "failed") return history.filter((item) => item.status === "failed");
    return history.filter((item) => item.status !== "failed" && item.reviewStatus === filter);
  }, [filter, history]);

  const selectedMeta = selected ? reviewCopy(selected) : null;
  const selectedWorkflow = workflows.find((workflow) => workflow.type === (selected?.requestType ?? form.type));

  async function submit(event) {
    event.preventDefault();
    await run(async () => {
      if (!clientId) throw new Error("Select a client from the workspace header first");
      const response = await generateAiResearch({ ...form, clientId, websiteId: websiteId || undefined });
      setSelected(response.request);
      setHistory((items) => [response.request, ...items]);
      notify("Research generated and queued for internal review", "success");
    });
  }

  async function review(reviewStatus) {
    await run(async () => {
      const response = await reviewAiResearch(selected.id, reviewStatus);
      setSelected(response.request);
      setHistory((items) => items.map((item) => item.id === response.request.id ? response.request : item));
      notify(reviewStatus === "approved" ? "Draft approved for internal use" : "Draft rejected", reviewStatus === "approved" ? "success" : "warning");
    });
  }

  return (
    <main className="page-shell ai-page">
      <PageHeader
        description="Generate evidence-bound research from the client data already stored in the platform. AI output is never client-ready until a manager reviews it."
        eyebrow="Internal research workspace"
        title="AI SEO analyst"
      />

      <Toolbar label="AI workspace tools">
        <ContextSummary label="Workspace" value={`${selectedClient?.companyName ?? "Select a client"}${selectedWebsite ? ` · ${selectedWebsite.domain}` : ""}`} />
        <Select aria-label="Filter research history" onChange={(event) => setFilter(event.target.value)} value={filter}>
          <option value="all">All drafts</option>
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </Select>
        <Button disabled={isLoading} icon={RefreshCw} onClick={() => run(load)} variant="secondary">Refresh</Button>
      </Toolbar>

      {error ? <Alert tone="error" title="AI workspace request failed">{error}</Alert> : null}

      <section className="ai-layout">
        <aside className="ai-controls">
          <Panel description="Choose a workflow and research direction for the active client." title="New research">
            <form className="ui-form-stack" onSubmit={submit}>
              <Select label="Workflow" onChange={(event) => setForm({ ...form, type: event.target.value })} value={form.type}>
                {workflows.map((workflow) => <option key={workflow.type} value={workflow.type}>{workflow.label}</option>)}
              </Select>
              <Textarea
                hint="Focus, seed terms, audience, or reporting angle"
                label="Research direction"
                maxLength={4000}
                onChange={(event) => setForm({ ...form, instructions: event.target.value })}
                placeholder="Focus, seed terms, audience, or reporting angle"
                rows={6}
                value={form.instructions}
              />
              <Button disabled={isLoading || !clientId} icon={Send} type="submit">{isLoading ? "Generating..." : "Generate draft"}</Button>
            </form>
          </Panel>

          <Panel actions={<Sparkles size={16} />} className="ai-history" description={`${visibleHistory.length} item${visibleHistory.length === 1 ? "" : "s"}`} title="History">
            {isLoading && !history.length ? <Skeleton lines={5} /> : visibleHistory.length ? visibleHistory.map((item) => {
              const meta = reviewCopy(item);
              return (
                <button className={selected?.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item)} type="button">
                  <strong>{workflows.find((workflow) => workflow.type === item.requestType)?.label ?? item.requestType}</strong>
                  <span>{item.client?.companyName}</span>
                  <Badge tone={reviewTone(item.status === "failed" ? "rejected" : item.reviewStatus)}>{meta.label}</Badge>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </button>
              );
            }) : <EmptyState description="Generated research drafts will appear here for review." icon={Clock3} title="No research history" />}
          </Panel>
        </aside>

        <section className="ai-output">
          {isLoading && !selected ? <Panel><Skeleton lines={8} /></Panel> : selected ? (
            <Panel
              actions={<StatusIndicator label={selectedMeta.label} status={selectedMeta.status === "error" ? "danger" : selectedMeta.status} />}
              description={selected.client?.companyName}
              title={selectedWorkflow?.label ?? selected.requestType}
            >
              <Alert tone={selectedMeta.status === "error" ? "error" : selectedMeta.status === "success" ? "success" : "warning"} title="Review state">
                {selectedMeta.note}
              </Alert>

              <div className="ai-meta">
                <span>Provider <strong>{selected.provider}</strong></span>
                <span>Model <strong>{selected.model}</strong></span>
                <span>Runtime <strong>{selected.durationMs ?? 0} ms</strong></span>
                <Badge tone={reviewTone(selected.status === "failed" ? "rejected" : selected.reviewStatus)}>
                  {selected.status === "failed" ? "Failed draft" : selected.reviewStatus.replaceAll("_", " ")}
                </Badge>
              </div>

              {selected.status === "failed" ? (
                <EmptyState description="Generation failed. Review the server provider configuration and try again." icon={ShieldAlert} title="No usable output" />
              ) : (
                <pre className={`ai-draft ai-draft--${selected.reviewStatus}`}>{selected.outputText}</pre>
              )}

              {canReview && selected.status === "completed" && selected.reviewStatus === "pending" ? (
                <div className="ai-review-actions">
                  <Button icon={Check} onClick={() => review("approved")}>Approve for internal use</Button>
                  <Button icon={X} onClick={() => review("rejected")} variant="danger">Reject draft</Button>
                </div>
              ) : null}

              {selected.reviewStatus === "approved" ? (
                <p className="ai-safe-note"><ShieldCheck size={15} /> Approved drafts remain internal. Use Reports to publish client-facing material.</p>
              ) : null}
            </Panel>
          ) : error ? (
            <Panel><ErrorState action={<Button onClick={() => run(load)}>Try again</Button>} description={error} title="AI workspace unavailable" /></Panel>
          ) : (
            <Panel><EmptyState description="Generate or select research to review it. Drafts always need human review before client delivery." icon={Sparkles} title="No draft selected" /></Panel>
          )}
        </section>
      </section>
    </main>
  );
}
