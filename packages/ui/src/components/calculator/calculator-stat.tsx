import { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type StatTone = 'default' | 'emerald' | 'sky';

interface CalculatorStatProps {
  label: string;
  value: ReactNode;
  helperText?: ReactNode;
  tone?: StatTone;
  className?: string;
}

const toneClasses: Record<Exclude<StatTone, 'default'>, string> = {
  emerald:
    'border-emerald-300/30 bg-gradient-to-br from-emerald-400/15 via-emerald-500/10 to-transparent text-emerald-100',
  sky: 'border-sky-300/30 bg-gradient-to-br from-sky-400/15 via-sky-500/10 to-transparent text-sky-50',
};

export function CalculatorStat({
  label,
  value,
  helperText,
  tone = 'default',
  className,
}: CalculatorStatProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors',
        tone !== 'default' && toneClasses[tone],
        className
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
        {label}
      </span>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {helperText && (
        <p className="mt-2 text-xs text-white/70">{helperText}</p>
      )}
    </div>
  );
}