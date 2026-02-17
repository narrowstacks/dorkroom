import type { FC } from 'react';
import { cn } from '../../lib/cn';

interface FilmCardSkeletonProps {
  className?: string;
}

export const FilmCardSkeleton: FC<FilmCardSkeletonProps> = ({ className }) => {
  return (
    <output
      className={cn('rounded-2xl border p-4 shadow-subtle', className)}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'var(--color-background)',
      }}
      aria-busy="true"
      aria-label="Loading film card"
    >
      <div className="flex gap-3 items-start">
        {/* Image skeleton */}
        <div
          className="aspect-square rounded-lg flex-shrink-0 overflow-hidden"
          style={{
            width: 60,
            height: 60,
            background:
              'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title skeleton */}
          <div
            className="h-5 rounded overflow-hidden"
            style={{
              width: '60%',
              background:
                'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s ease-in-out infinite',
            }}
          />

          {/* Tags skeleton */}
          <div className="flex gap-2">
            <div
              className="h-5 rounded-full overflow-hidden"
              style={{
                width: 70,
                background:
                  'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
            <div
              className="h-5 rounded-full overflow-hidden"
              style={{
                width: 60,
                background:
                  'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>
    </output>
  );
};
