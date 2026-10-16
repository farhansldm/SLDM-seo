import { forwardRef, useId } from "react";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export const Button = forwardRef(function Button({ children, className, icon: Icon, variant = "primary", size = "md", type = "button", ...props }, ref) {
  return (
    <button className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)} ref={ref} type={type} {...props}>
      {Icon ? <Icon aria-hidden="true" size={size === "sm" ? 15 : 17} /> : null}
      <span>{children}</span>
    </button>
  );
});

export const IconButton = forwardRef(function IconButton({ className, icon: Icon, label, size = "md", variant = "ghost", ...props }, ref) {
  return (
    <button aria-label={label} className={cx("ui-icon-button", `ui-button--${variant}`, `ui-button--${size}`, className)} ref={ref} title={label} type="button" {...props}>
      <Icon aria-hidden="true" size={size === "sm" ? 15 : 18} />
    </button>
  );
});

function Field({ children, className, error, hint, id, label, required }) {
  return (
    <label className={cx("ui-field", error && "ui-field--invalid", className)} htmlFor={id}>
      {label ? <span className="ui-field__label">{label}{required ? <span aria-hidden="true"> *</span> : null}</span> : null}
      {children}
      {error ? <span className="ui-field__message" role="alert">{error}</span> : hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ className, error, hint, id: providedId, label, required, ...props }, ref) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return <Field className={className} error={error} hint={hint} id={id} label={label} required={required}><input aria-invalid={Boolean(error)} className="ui-control" id={id} ref={ref} required={required} {...props} /></Field>;
});

export const Select = forwardRef(function Select({ children, className, error, hint, id: providedId, label, required, ...props }, ref) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return <Field className={className} error={error} hint={hint} id={id} label={label} required={required}><select aria-invalid={Boolean(error)} className="ui-control" id={id} ref={ref} required={required} {...props}>{children}</select></Field>;
});

export const Textarea = forwardRef(function Textarea({ className, error, hint, id: providedId, label, required, ...props }, ref) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return <Field className={className} error={error} hint={hint} id={id} label={label} required={required}><textarea aria-invalid={Boolean(error)} className="ui-control ui-control--textarea" id={id} ref={ref} required={required} {...props} /></Field>;
});

export function Checkbox({ checked, className, description, label, onChange, ...props }) {
  return <label className={cx("ui-check", className)}><input checked={checked} onChange={onChange} type="checkbox" {...props} /><span><strong>{label}</strong>{description ? <small>{description}</small> : null}</span></label>;
}

export function Toggle({ checked, className, label, onChange, ...props }) {
  return <label className={cx("ui-toggle", className)}><span>{label}</span><input checked={checked} onChange={onChange} role="switch" type="checkbox" {...props} /><i aria-hidden="true" /></label>;
}

