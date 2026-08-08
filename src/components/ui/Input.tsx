/**
 * Input primitives — `<Input>` is the styled control; `<Field>` is the
 * label-input-hint-error wrapper that should be the default for forms.
 *
 * Usage:
 *   <Field label="Project name" hint="Max 60 characters">
 *     <Input placeholder="e.g. Q4 Sales" value={v} onChange={...} />
 *   </Field>
 *
 *   <Field label="Email" error={err}>
 *     <Input type="email" value={v} onChange={...} error={!!err} />
 *   </Field>
 *
 *   // Standalone input (no field wrapper):
 *   <Input value={v} onChange={...} />
 */

import React from 'react';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
}>(function Input({ className, error, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={joinClasses('ui-input', error && 'ui-input--error', className)}
      {...rest}
    />
  );
});

export function Label({
  children, htmlFor, hint, className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={joinClasses('ui-label', className)}>
      <span>{children}</span>
      {hint && <span className="ui-label__hint">{hint}</span>}
    </label>
  );
}

export function Field({
  label, hint, error, htmlFor, className, children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={joinClasses('ui-field', className)}>
      {label && <Label htmlFor={htmlFor} hint={hint && !error ? hint : undefined}>{label}</Label>}
      {children}
      {error
        ? <div className="ui-field__error" role="alert">{error}</div>
        : (hint && !label ? <div className="ui-field__hint">{hint}</div> : null)}
    </div>
  );
}
