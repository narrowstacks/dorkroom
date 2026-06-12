import { memo, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { AccentTone } from './accent-tone';

type StatTone = 'default' | AccentTone;

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

// Theme-aware tone styles backed by the plan-003 `--accent-<tone>-*` vars.
// Text uses the 006 on-accent tokens so it stays readable on the gradient.
const getToneStyle = (tone: Exclude<StatTone, 'default'>): ToneStyles => ({
  container: {
    borderColor: `var(--accent-${tone}-border, var(--color-border-secondary))`,
    background: `var(--accent-${tone}-gradient)`,
  },
  label: 'var(--color-on-accent-soft)',
  value: 'var(--color-on-accent)',
  helper: 'var(--color-on-accent-muted)',
});

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
        className="text-xs font-semibold uppercase tracking-[0.2em]"
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
