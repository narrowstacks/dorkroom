import type { ChangeEvent } from 'react';
import { useId, useState } from 'react';
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
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();
  const rangeId = `${inputId}-range`;

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
    <div className={cn('space-y-3')}>
      <div className={cn('flex items-center justify-between', className)}>
        <label
          htmlFor={inputId}
          id={`${inputId}-label`}
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {label}
        </label>
        <input
          type="number"
          id={inputId}
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          className={cn(
            'w-20 rounded px-2 py-1 text-sm border transition-colors',
            'focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
            warning
              ? 'border-yellow-500/50 bg-yellow-500/10 focus-visible:outline-yellow-500'
              : cn(
                  'border-[var(--color-border-primary)] bg-[var(--color-surface)]',
                  isFocused && 'border-[var(--color-border-secondary)]',
                  'focus-visible:outline-[var(--color-border-secondary)]'
                )
          )}
          style={{
            color: 'var(--color-text-primary)',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>

      <div className="space-y-2">
        <input
          type="range"
          id={rangeId}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          aria-labelledby={`${inputId}-label`}
          className={cn(
            'w-full h-2 rounded-lg appearance-none cursor-pointer slider-track',
            warning && 'bg-yellow-500/20'
          )}
        />

        {labels.length > 0 && (
          <div
            className="flex justify-between text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
