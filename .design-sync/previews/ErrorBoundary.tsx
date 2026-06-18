import { ErrorBoundary } from '@dorkroom/ui';

// Healthy: the boundary renders its children untouched when nothing throws.
export const Healthy = () => (
  <div style={{ maxWidth: 420 }}>
    <ErrorBoundary>
      <div
        style={{
          padding: 16,
          borderRadius: 16,
          border: '1px solid var(--color-border-primary)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <p
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          Reciprocity curve loaded
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Kodak Tri-X 400 · 30s metered → 73s corrected
        </p>
      </div>
    </ErrorBoundary>
  </div>
);

// A child that throws on render to trip the boundary.
function ExplodingChart(): never {
  throw new Error('Failed to render reciprocity curve: missing factor');
}

// Fallback: a child throws, so the boundary catches it and shows the default
// recovery UI ("Something went wrong" + Reload Page).
export const Fallback = () => (
  <div style={{ maxWidth: 420 }}>
    <ErrorBoundary>
      <ExplodingChart />
    </ErrorBoundary>
  </div>
);
