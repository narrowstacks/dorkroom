import type { ReactNode } from 'react';

export function LoadingSpinner(): ReactNode {
  return (
    // <output> has an implicit ARIA role of "status", so it announces as a
    // polite live region exactly like role="status" — and the linter's
    // prefer-tag-over-role rule wants the semantic tag here.
    <output
      className="flex items-center justify-center min-h-[50vh]"
      aria-label="Loading"
      aria-live="polite"
    >
      <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
      <span className="sr-only">Loading…</span>
    </output>
  );
}
