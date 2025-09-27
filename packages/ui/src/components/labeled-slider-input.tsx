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

/**
 * Render a labeled numeric input paired with a synchronized range slider.
 *
 * The numeric input and slider share the same value; typing in the number input
 * invokes `onChange`, while moving the slider invokes `onSliderChange` when provided.
 *
 * @param label - Text label displayed alongside the numeric input
 * @param value - Current numeric value shown by both the input and slider
 * @param onChange - Called with the new numeric value when the number input changes
 * @param onSliderChange - Optional handler called with the numeric value when the slider moves
 * @param min - Minimum allowed value for both input and slider
 * @param max - Maximum allowed value for both input and slider
 * @param step - Increment step for both input and slider
 * @param labels - Optional array of evenly spaced labels displayed under the slider
 * @param className - Optional additional container class names
 * @param warning - When true, apply warning visual styles to the inputs
 * @param continuousUpdate - Reserved flag for continuous update behavior (unused by this component)
 * @returns The JSX element for the labeled slider input
 */
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
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
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
