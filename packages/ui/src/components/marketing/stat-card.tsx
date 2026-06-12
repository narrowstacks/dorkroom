import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ElementType } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';

export type StatCardColorKey = 'emerald' | 'rose' | 'indigo';

export interface StatCardProps extends ComponentProps<'a'> {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColorKey?: StatCardColorKey;
  variant?: 'horizontal' | 'vertical';
  as?: ElementType;
  to?: string;
  search?: Record<string, unknown>;
  loading?: boolean;
}

/**
 * Literal Tailwind hover-border class per accent (subset of AccentColor).
 * Tailwind must see the full class string in source, so these are not built
 * by interpolation. The gradient overlay uses an inline `--accent-*-gradient`
 * custom property instead.
 */
const HOVER_BORDER_CLASSES: Record<StatCardColorKey, string> = {
  emerald: 'group-hover:border-[color:var(--accent-emerald-border)]',
  rose: 'group-hover:border-[color:var(--accent-rose-border)]',
  indigo: 'group-hover:border-[color:var(--accent-indigo-border)]',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColorKey,
  variant = 'vertical',
  as: Component = 'a',
  className,
  href,
  to,
  search,
  loading = false,
  ...props
}: StatCardProps) {
  const iconColorVar = iconColorKey
    ? `var(--color-icon-stat-${iconColorKey})`
    : 'var(--color-text-primary)';

  const border = iconColorKey ? HOVER_BORDER_CLASSES[iconColorKey] : undefined;

  const componentProps =
    Component === 'a' ? { href } : { to: href || to, search, ...props };

  if (loading) {
    if (variant === 'horizontal') {
      return (
        <div
          className={cn(
            'flex items-center gap-4 px-5 py-4 rounded-2xl border',
            'bg-[color:var(--color-surface)]',
            'border-[color:var(--color-border-primary)]',
            className
          )}
        >
          <Skeleton className="size-8 rounded-xl bg-[color:var(--color-surface-muted)]" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-2 bg-[color:var(--color-surface-muted)]" />
            <Skeleton className="h-6 w-16 bg-[color:var(--color-surface-muted)]" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'flex flex-col gap-2 p-4 rounded-2xl border',
          'bg-[color:var(--color-surface)]',
          'border-[color:var(--color-border-primary)]',
          className
        )}
      >
        <Skeleton className="h-3 w-24 bg-[color:var(--color-surface-muted)]" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg bg-[color:var(--color-surface-muted)]" />
          <Skeleton className="h-6 w-16 bg-[color:var(--color-surface-muted)]" />
        </div>
      </div>
    );
  }

  const commonClasses = cn(
    'relative overflow-hidden rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2',
    'border-[color:var(--color-border-primary)]',
    'hover:bg-[color:var(--color-surface-muted)]',
    'focus-visible:ring-[color:var(--color-border-primary)]',
    '[&:not([data-theme="high-contrast"])]:hover:-translate-y-0.5',
    '[&:not([data-theme="high-contrast"])]:hover:shadow-lg',
    border,
    className
  );

  const gradientOverlay = iconColorKey ? (
    <div
      className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
      style={{ backgroundImage: `var(--accent-${iconColorKey}-gradient)` }}
    />
  ) : null;

  if (variant === 'horizontal') {
    return (
      <Component
        {...componentProps}
        aria-label={label}
        title={`${label}: ${value}`}
        className={cn('group flex items-center gap-4 px-5 py-4', commonClasses)}
        style={{
          backgroundColor: 'var(--color-tool-card-bg)',
        }}
      >
        {gradientOverlay}
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div
            className="p-2 rounded-xl transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              color: iconColorVar,
            }}
          >
            <Icon className="size-4" data-statcard-icon />
          </div>
          <div>
            <span className="text-[color:var(--color-text-tertiary)] text-sm font-medium">
              {label}
            </span>
            <span className="text-2xl font-bold text-[color:var(--color-text-primary)] block leading-none mb-1">
              {value}
            </span>
          </div>
        </div>
      </Component>
    );
  }

  return (
    <Component
      {...componentProps}
      aria-label={label}
      title={`${label}: ${value}`}
      className={cn('group flex flex-col gap-2 p-4', commonClasses)}
      style={{
        backgroundColor: 'var(--color-tool-card-bg)',
      }}
    >
      {gradientOverlay}
      <div className="relative z-10 flex flex-col gap-2 w-full">
        <span className="text-[color:var(--color-text-tertiary)] text-xs font-medium">
          {label}
        </span>
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg shrink-0 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-muted)',
              color: iconColorVar,
            }}
          >
            <Icon className="size-5" data-statcard-icon />
          </div>
          <span className="text-2xl font-bold text-[color:var(--color-text-primary)] leading-none">
            {value}
          </span>
        </div>
      </div>
    </Component>
  );
}
