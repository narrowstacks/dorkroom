import { ReactNode, memo } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

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

// Legacy - replaced with getAccentStyle function

// Theme-aware accent styles using predefined gradients
const getAccentStyle = (
  accent: Exclude<AccentTone, 'none'>
): React.CSSProperties => {
  switch (accent) {
    case 'emerald':
      return {
        background: 'var(--gradient-card-primary)',
      };
    case 'sky':
      return {
        background: 'var(--gradient-card-info)',
      };
    case 'violet':
      return {
        background: 'var(--gradient-card-accent)',
      };
  }
};

export const CalculatorCard = memo(function CalculatorCard({
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
        'relative overflow-hidden rounded-3xl border shadow-subtle card-ring',
        padding === 'compact' ? 'p-5 sm:p-6' : 'p-6 sm:p-8',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: colorMixOr(
          'var(--color-surface)',
          80,
          'transparent',
          'var(--color-border-muted)'
        ),
      }}
      role="region"
      aria-label={title || 'Calculator card'}
    >
      {accent !== 'none' && (
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={getAccentStyle(accent)}
        />
      )}
      <div className="relative z-10 flex flex-col gap-6">
        {(title || description || actions) && (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title && (
                <h2
                  className="text-lg font-semibold tracking-tight sm:text-xl"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {description}
                </div>
              )}
            </div>
            {actions && (
              <div className="flex items-start justify-end">{actions}</div>
            )}
          </header>
        )}
        <div className="flex flex-col gap-5">{children}</div>
      </div>
    </section>
  );
});
