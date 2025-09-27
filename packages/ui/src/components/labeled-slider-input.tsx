import type { ChangeEvent } from 'react';
import { cn } from '../lib/cn';

interface LabeledSliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onSliderChange?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  labels?: string[];
  className?: string;
  warning?: boolean;
  continuousUpdate?: boolean;
}

export function LabeledSliderInput({
  label,
  value,
  onChange,
  onSliderChange,
  min,
  max,
  step,
  labels = [],
  className,
  warning = false,
  continuousUpdate = false,
}: LabeledSliderInputProps) {
  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat((e.target as HTMLInputElement).value);
    // For slider interactions, prefer the dedicated slider change handler
    // to keep state strictly numeric during continuous updates.
    onSliderChange?.(newValue);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat((e.target as HTMLInputElement).value) || 0;
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-20 rounded px-2 py-1 text-sm focus:outline-none',
            warning ? 'border-yellow-500/50 bg-yellow-500/10' : ''
          )}
          style={{
            borderColor: warning ? undefined : 'var(--color-border-primary)',
            backgroundColor: warning ? undefined : 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            ...(warning ? {} : {
              '--tw-ring-color': 'var(--color-border-secondary)',
            }),
          }}
          onFocus={(e) => {
            if (!warning) {
              e.target.style.borderColor = 'var(--color-border-secondary)';
            }
          }}
          onBlur={(e) => {
            if (!warning) {
              e.target.style.borderColor = 'var(--color-border-primary)';
            }
          }}
        />
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className={cn(
            'w-full h-2 rounded-lg appearance-none cursor-pointer slider-track',
            warning && 'bg-yellow-500/20'
          )}
        />

        {labels.length > 0 && (
          <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
