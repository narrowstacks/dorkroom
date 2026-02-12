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

interface ToneStyles {
  container: React.CSSProperties;
  label: string;
  value: string;
  helper: string;
}

// Theme-aware tone styles using predefined gradients
// Uses high-contrast text colors against gradient backgrounds
const getToneStyle = (tone: Exclude<StatTone, 'default'>): ToneStyles => {
  switch (tone) {
    case 'emerald':
      return {
        container: {
          borderColor: colorMixOr(
            'var(--color-semantic-success)',
            30,
            'transparent',
            'var(--color-border-secondary)'
          ),
          background: 'var(--gradient-card-primary)',
        },
        label: 'var(--color-text-primary)',
        value: 'var(--color-text-primary)',
        helper: 'var(--color-text-primary)',
      };
    case 'sky':
      return {
        container: {
          borderColor: colorMixOr(
            'var(--color-semantic-info)',
            30,
            'transparent',
            'var(--color-border-secondary)'
          ),
          background: 'var(--gradient-card-info)',
        },
        label: 'var(--color-text-primary)',
        value: 'var(--color-text-primary)',
        helper: 'var(--color-text-primary)',
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
  const toneStyle = tone !== 'default' ? getToneStyle(tone) : null;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 backdrop-blur-sm transition-colors',
        className
      )}
      style={
        toneStyle
          ? toneStyle.container
          : {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgb(var(--color-background-rgb) / 0.15)',
            }
      }
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.3em]"
        style={{
          color: toneStyle ? toneStyle.label : 'var(--color-text-primary)',
        }}
      >
        {label}
      </span>
      <div
        className="mt-1 text-2xl font-semibold tracking-tight"
        style={{
          color: toneStyle ? toneStyle.value : 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
      {helperText && (
        <p
          className="mt-1 text-[11px]"
          style={{
            color: toneStyle ? toneStyle.helper : 'var(--color-text-secondary)',
          }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});
