import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type AccentTone = 'emerald' | 'sky' | 'violet' | 'none';

interface CalculatorCardProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: AccentTone;
  padding?: 'normal' | 'compact';
}

const accentBackgrounds: Record<Exclude<AccentTone, 'none'>, string> = {
  emerald: 'bg-gradient-to-br from-emerald-400/25 via-emerald-500/10 to-transparent',
  sky: 'bg-gradient-to-br from-sky-400/25 via-sky-500/10 to-transparent',
  violet: 'bg-gradient-to-br from-violet-400/25 via-fuchsia-500/10 to-transparent',
};

export function CalculatorCard({
  title,
  description,
  actions,
  children,
  className,
  accent = 'none',
  padding = 'normal',
}: CalculatorCardProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/12 bg-surface/80 shadow-subtle card-ring',
        padding === 'compact' ? 'p-5 sm:p-6' : 'p-6 sm:p-8',
        className
      )}
    >
      {accent !== 'none' && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 opacity-90',
            accentBackgrounds[accent]
          )}
        />
      )}
      <div className="relative z-10 flex flex-col gap-6">
        {(title || description || actions) && (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title && (
                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {title}
                </h2>
              )}
              {description && (
                <div className="text-sm leading-relaxed text-white/70">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="flex items-start justify-end">{actions}</div>}
          </header>
        )}
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </section>
  );
}