import { memo, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

type StatTone = 'default' | 'emerald' | 'sky';

interface CalculatorStatProps {
  label: string;
  value: ReactNode;
  helperText?: ReactNode;
  tone?: StatTone;
  className?: string;
}

// Legacy - replaced with getToneStyle function

// Theme-aware tone styles using predefined gradients
const getToneStyle = (
  tone: Exclude<StatTone, 'default'>
): React.CSSProperties => {
  switch (tone) {
    case 'emerald':
      return {
        borderColor: colorMixOr(
          'var(--color-semantic-success)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
        background: 'var(--gradient-card-primary)',
        color: colorMixOr(
          'var(--color-semantic-success)',
          90,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
      };
    case 'sky':
      return {
        borderColor: colorMixOr(
          'var(--color-semantic-info)',
          30,
          'transparent',
          'var(--color-border-secondary)'
        ),
        background: 'var(--gradient-card-info)',
        color: colorMixOr(
          'var(--color-semantic-info)',
          90,
          'var(--color-text-primary)',
          'var(--color-text-primary)'
        ),
      };
  }
};

export const CalculatorStat = memo(function CalculatorStat({
  label,
  value,
  helperText,
  tone = 'default',
  className,
}: CalculatorStatProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-5 backdrop-blur-sm transition-colors',
        className
      )}
      style={
        tone !== 'default'
          ? getToneStyle(tone)
          : {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgb(var(--color-background-rgb) / 0.15)',
            }
      }
    >
      <span
        className="text-xs font-semibold uppercase tracking-[0.35em]"
        style={{
          color: tone !== 'default' ? 'inherit' : 'var(--color-text-primary)',
        }}
      >
        {label}
      </span>
      <div
        className="mt-3 text-3xl font-semibold tracking-tight"
        style={{
          color: tone !== 'default' ? 'inherit' : 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
      {helperText && (
        <p
          className="mt-2 text-xs"
          style={{
            color:
              tone !== 'default' ? 'inherit' : 'var(--color-text-secondary)',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});
