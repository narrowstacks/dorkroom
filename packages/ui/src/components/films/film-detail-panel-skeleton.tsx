import type { FC } from 'react';
import { createPortal } from 'react-dom';

/**
 * Props for the FilmDetailPanelSkeleton component.
 */
interface FilmDetailPanelSkeletonProps {
  /** Whether to render in mobile mode (bottom drawer) vs desktop mode (sidebar) */
  isMobile: boolean;
}

/**
 * Skeleton loading state for FilmDetailPanel.
 * Matches the layout and position of the actual detail panel.
 *
 * @param isMobile - If true, renders as mobile bottom drawer; if false, renders as desktop sidebar
 * @returns The skeleton element
 *
 * @public
 */
export const FilmDetailPanelSkeleton: FC<FilmDetailPanelSkeletonProps> = ({
  isMobile,
}) => {
  if (typeof document === 'undefined') {
    return null;
  }

  // Mobile bottom drawer skeleton
  if (isMobile) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-end"
        style={{
          backgroundColor: 'var(--color-visualization-overlay)',
          height: '100dvh',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Loading film details"
      >
        <div
          className="relative w-full rounded-t-3xl border border-b-0 shadow-xl"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface)',
            maxHeight: '80vh',
          }}
        >
          {/* Content */}
          <div
            className="overflow-y-auto px-6 py-6"
            style={{ maxHeight: 'calc(80vh - 3rem)' }}
          >
            <SkeletonContent />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Desktop sidebar skeleton
  return (
    <section
      className="sticky top-4 w-[360px] flex-shrink-0 rounded-2xl border shadow-xl animate-slide-fade-right"
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-surface)',
        maxHeight: 'calc(100vh - 2rem)',
      }}
      aria-label="Loading film details"
    >
      {/* Content */}
      <div
        className="overflow-y-auto p-6"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        <SkeletonContent />
      </div>
    </section>
  );
};

/**
 * Internal component for rendering skeleton content.
 * Matches the structure of FilmDetailContent.
 */
const SkeletonContent: FC = () => {
  return (
    <div className="space-y-6">
      {/* Film image skeleton */}
      <div className="flex justify-center">
        <div
          className="rounded-lg overflow-hidden"
          style={{
            width: 128,
            height: 128,
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Title skeleton */}
      <div>
        <div
          className="h-7 rounded mb-2 overflow-hidden"
          style={{
            width: '80%',
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div
          className="h-4 rounded overflow-hidden"
          style={{
            width: '40%',
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Badges skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="h-6 rounded-full overflow-hidden"
          style={{
            width: 80,
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div
          className="h-6 rounded-full overflow-hidden"
          style={{
            width: 60,
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Description skeleton */}
      <div>
        <div
          className="h-4 rounded mb-2 overflow-hidden"
          style={{
            width: '50%',
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div className="space-y-2">
          <div
            className="h-4 rounded overflow-hidden"
            style={{
              width: '100%',
              background:
                'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            className="h-4 rounded overflow-hidden"
            style={{
              width: '90%',
              background:
                'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
          <div
            className="h-4 rounded overflow-hidden"
            style={{
              width: '85%',
              background:
                'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* Additional fields skeleton */}
      <div>
        <div
          className="h-4 rounded mb-2 overflow-hidden"
          style={{
            width: '40%',
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
        <div
          className="h-4 rounded overflow-hidden"
          style={{
            width: '70%',
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Button skeleton */}
      <div
        className="h-10 rounded-lg overflow-hidden"
        style={{
          width: '100%',
          background:
            'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }}
      />
    </div>
  );
};
