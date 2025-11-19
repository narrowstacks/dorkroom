import { type LucideIcon } from 'lucide-react';
import type { ComponentProps, ElementType } from 'react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/skeleton';

export interface StatCardProps extends ComponentProps<'a'> {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  variant?: 'horizontal' | 'vertical';
  as?: ElementType;
  to?: string;
  search?: Record<string, unknown>;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  variant = 'vertical',
  as: Component = 'a',
  className,
  href,
  to,
  search,
  loading = false,
  ...props
}: StatCardProps) {
  const componentProps =
    Component === 'a' ? { href } : { to: href || to, search, ...props };

  if (loading) {
    if (variant === 'horizontal') {
      return (
        <div
          className={cn(
            'flex items-center gap-4 px-5 py-4 rounded-2xl bg-zinc-900/50 border border-zinc-800',
            className
          )}
        >
          <Skeleton className="w-8 h-8 rounded-xl bg-zinc-800" />
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-2 bg-zinc-800" />
            <Skeleton className="h-6 w-16 bg-zinc-800" />
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'flex flex-col gap-2 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800',
          className
        )}
      >
        <Skeleton className="h-3 w-24 bg-zinc-800" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg bg-zinc-800" />
          <Skeleton className="h-6 w-16 bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Component
        {...componentProps}
        aria-label={label}
        className={cn(
          'flex items-center gap-4 px-5 py-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors group focus:outline-none focus:ring-2 focus:ring-white/20',
          className
        )}
      >
        <div
          className={cn(
            'p-2 rounded-xl transition-colors',
            iconBg,
            iconColor
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <span className="text-zinc-500 text-sm font-medium">{label}</span>
          <span className="text-2xl font-bold text-white block leading-none mb-1">
            {value}
          </span>
        </div>
      </Component>
    );
  }

  return (
    <Component
      {...componentProps}
      aria-label={label}
      className={cn(
        'flex flex-col gap-2 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 transition-colors group focus:outline-none focus:ring-2 focus:ring-white/20',
        className
      )}
    >
      <span className="text-zinc-500 text-xs font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg shrink-0 transition-colors',
            iconBg,
            iconColor
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-white leading-none">
          {value}
        </span>
      </div>
    </Component>
  );
}

