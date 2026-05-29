import type { JSX } from 'react';

export function LoadingSpinner(): JSX.Element {
  return (
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
