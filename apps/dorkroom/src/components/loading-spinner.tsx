import { JSX } from 'react';

export function LoadingSpinner(): JSX.Element {
  return (
    <div
      className="flex items-center justify-center min-h-[50vh]"
      role="status"
      aria-live="polite"
    >
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        aria-label="Loading"
      ></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
