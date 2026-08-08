/**
 * Button — single primitive that replaces every ad-hoc <button className="...">
 * variant scattered across the app.
 *
 * Usage:
 *   <Button>Save</Button>                              // primary md
 *   <Button variant="secondary" size="sm">Cancel</Button>
 *   <Button variant="ghost" iconOnly aria-label="Close"><X size={16}/></Button>
 *   <Button variant="danger" loading>Delete forever</Button>
 *   <Button as="a" href="/help" variant="link">Learn more</Button>
 *
 * Notes:
 *   - `loading` swaps the leading slot for a spinner and disables the button
 *   - `iconOnly` makes the button square (provide aria-label for a11y)
 *   - Polymorphic via `as` — defaults to <button>, supports <a> for links
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size    = 'sm' | 'md' | 'lg';

type BaseProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

type ButtonAsButton = BaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
  as?: 'button';
};
type ButtonAsAnchor = BaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
  as: 'a';
};

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    block = false,
    iconOnly = false,
    loading = false,
    leading,
    trailing,
    children,
    className,
    ...rest
  } = props;

  const classes = joinClasses(
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    block    && 'ui-btn--block',
    iconOnly && 'ui-btn--icon',
    className,
  );

  const content = (
    <>
      {loading
        ? <Loader2 size={size === 'sm' ? 13 : size === 'lg' ? 17 : 15} className="ui-btn__spin"/>
        : leading}
      {!iconOnly && children}
      {!loading && trailing}
    </>
  );

  if ('as' in rest && rest.as === 'a') {
    const { as: _as, ...anchorProps } = rest as ButtonAsAnchor;
    return (
      <a className={classes} {...anchorProps}>{content}</a>
    );
  }

  const buttonRest = rest as ButtonAsButton;
  return (
    <button
      type={buttonRest.type ?? 'button'}
      className={classes}
      disabled={buttonRest.disabled || loading}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
