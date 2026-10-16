import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { IconButton } from "./controls.jsx";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

const icons = { error: AlertCircle, info: Info, success: CheckCircle2, warning: AlertCircle };

export function Alert({ children, className, title, tone = "info" }) {
  const Icon = icons[tone] ?? Info;
  return <div className={cx("ui-alert", `ui-alert--${tone}`, className)} role={tone === "error" ? "alert" : "status"}><Icon aria-hidden="true" size={18} /><div>{title ? <strong>{title}</strong> : null}<p>{children}</p></div></div>;
}

export function EmptyState({ action, description, icon: Icon = Info, title }) {
  return <div className="ui-empty"><span><Icon aria-hidden="true" size={22} /></span><h3>{title}</h3>{description ? <p>{description}</p> : null}{action}</div>;
}

export function ErrorState({ action, description, title = "Something went wrong" }) {
  return <EmptyState action={action} description={description} icon={AlertCircle} title={title} />;
}

export function Skeleton({ className, lines = 3 }) {
  return <div aria-busy="true" aria-label="Loading" className={cx("ui-skeleton", className)}>{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}

function useEscape(onClose, open) {
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose, open]);
}

function Overlay({ children, description, kind, onClose, open, title }) {
  const titleId = useId();
  useEscape(onClose, open);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open) return null;
  return <div className="ui-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section aria-labelledby={titleId} aria-modal="true" className={`ui-${kind}`} role="dialog"><header><div><h2 id={titleId}>{title}</h2>{description ? <p>{description}</p> : null}</div><IconButton icon={X} label="Close" onClick={onClose} /></header>{children}</section></div>;
}

export function Dialog(props) { return <Overlay kind="dialog" {...props} />; }
export function Drawer(props) { return <Overlay kind="drawer" {...props} />; }

export function Dropdown({ children, label }) {
  return <details className="ui-dropdown"><summary>{label}</summary><div>{children}</div></details>;
}

export function Tooltip({ children, content }) {
  return <span className="ui-tooltip" data-tooltip={content}>{children}</span>;
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const notify = useCallback((message, tone = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 5000);
    return id;
  }, [dismiss]);
  const value = useMemo(() => ({ dismiss, notify }), [dismiss, notify]);
  return <ToastContext.Provider value={value}>{children}<div aria-live="polite" className="ui-toast-region">{toasts.map((toast) => { const Icon = icons[toast.tone] ?? Info; return <div className={`ui-toast ui-toast--${toast.tone}`} key={toast.id} role="status"><Icon aria-hidden="true" size={18} /><span>{toast.message}</span><IconButton icon={X} label="Dismiss notification" onClick={() => dismiss(toast.id)} size="sm" /></div>; })}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

