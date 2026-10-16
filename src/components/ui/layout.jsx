import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, IconButton } from "./controls.jsx";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export function PageHeader({ actions, description, eyebrow, title }) {
  return <header className="ui-page-header"><div><span className="ui-page-header__eyebrow">{eyebrow}</span><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="ui-page-header__actions">{actions}</div> : null}</header>;
}

export function Toolbar({ children, className, label = "Page tools" }) {
  return <section aria-label={label} className={cx("ui-toolbar", className)}>{children}</section>;
}

export function FilterBar({ children, className }) {
  return <div className={cx("ui-filter-bar", className)}>{children}</div>;
}

export function Tabs({ active, ariaLabel = "Views", items, onChange }) {
  return <div aria-label={ariaLabel} className="ui-tabs" role="tablist">{items.map((item) => <button aria-selected={active === item.value} key={item.value} onClick={() => onChange(item.value)} role="tab" type="button">{item.icon ? <item.icon aria-hidden="true" size={16} /> : null}{item.label}</button>)}</div>;
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function StatusIndicator({ label, status = "neutral" }) {
  return <span className={`ui-status ui-status--${status}`}><i aria-hidden="true" />{label}</span>;
}

export function Panel({ actions, children, className, description, title }) {
  return <section className={cx("ui-panel", className)}>{title || actions ? <header className="ui-panel__header"><div>{title ? <h2>{title}</h2> : null}{description ? <p>{description}</p> : null}</div>{actions}</header> : null}{children}</section>;
}

export function KpiCard({ change, changeTone = "neutral", label, value }) {
  return <article className="ui-kpi"><span>{label}</span><strong>{value}</strong>{change ? <small className={`ui-kpi__change ui-kpi__change--${changeTone}`}>{change}</small> : null}</article>;
}

export function DataTable({ caption, columns, empty, rows, rowKey = "id" }) {
  if (!rows.length) return empty ?? null;
  return <div className="ui-table-wrap"><table className="ui-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey]}>{columns.map((column) => <td data-label={column.label} key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function Pagination({ onPageChange, page, pageCount }) {
  return <nav aria-label="Pagination" className="ui-pagination"><IconButton disabled={page <= 1} icon={ChevronLeft} label="Previous page" onClick={() => onPageChange(page - 1)} /><span>Page {page} of {pageCount}</span><IconButton disabled={page >= pageCount} icon={ChevronRight} label="Next page" onClick={() => onPageChange(page + 1)} /></nav>;
}

export function ContextSummary({ label, value }) {
  return <div className="ui-context"><span>{label}</span><strong>{value}</strong></div>;
}

export function ConfirmationActions({ cancelLabel = "Cancel", confirmLabel = "Confirm", destructive = false, onCancel, onConfirm }) {
  return <div className="ui-confirm-actions"><Button onClick={onCancel} variant="secondary">{cancelLabel}</Button><Button onClick={onConfirm} variant={destructive ? "danger" : "primary"}>{confirmLabel}</Button></div>;
}

