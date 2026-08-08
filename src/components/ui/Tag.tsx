/**
 * Tag — small, single-line label for status / category / count chips.
 *
 * Usage:
 *   <Tag>Draft</Tag>
 *   <Tag tone="success">Live</Tag>
 *   <Tag tone="warning"><AlertCircle size={11}/> 3 issues</Tag>
 *   <Tag tone="accent">New</Tag>
 *
 * Tones map to semantic feedback colors from tokens.css. The default tone
 * (neutral) uses the subtle gray surface — best for "not-status" labels
 * like categories and counts.
 */

import React from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

function joinClasses(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Tag({
  tone = 'neutral', className, children, ...rest
}: {
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={joinClasses('ui-tag', tone !== 'neutral' && `ui-tag--${tone}`, className)}
      {...rest}
    >
      {children}
    </span>
  );
}
