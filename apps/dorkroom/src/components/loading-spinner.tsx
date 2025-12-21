import type { JSX } from 'react';

export function LoadingSpinner(): JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="status" is correct for loading indicators, <output> is for calculations
    <div
      className="flex items-center justify-center min-h-[50vh]"
      role="status"
      aria-label="Loading"
      aria-live="polite"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
