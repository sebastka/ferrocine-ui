// Small shared building blocks.

import type { MouseEvent, ReactNode } from 'react';
import { navigate } from '../router.ts';

/** An in-app link: a real `<a href>` (middle click, copy link) that navigates without reloading. */
export function Link({
  to,
  className,
  children,
  title,
  ariaLabel,
  current,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
  /** Marks the link as the current page (`aria-current="page"`). */
  current?: boolean;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a
      href={to}
      className={className}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </a>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner-ring" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{error.message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** A thin progress bar (watch progress), 0 to 1. */
export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className={`progress${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
