import type { ChangeEvent } from 'react';
import { useId, useState, memo } from 'react';
import { cn } from '../lib/cn';

/**
 * Props for the LabeledSliderInput component.
 * Provides configuration for a dual-input component with both slider and number input.
 *
 * @public
 */
interface LabeledSliderInputProps {
  /** Display label for the input group */
  label: string;
  /** Current numeric value */
  value: number;
  /** Callback for value changes from the number input */
  onChange: (value: number) => void;
  /** Optional callback for slider-specific changes (for continuous updates) */
  onSliderChange?: (value: number) => void;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Step increment for the slider */
  step: number;
  /** Optional labels to display below the slider for reference points */
  labels?: string[];
  /** Optional CSS class name for styling customization */
  className?: string;
  /** Whether to display warning styling (yellow border/background) */
  warning?: boolean;
  /** Whether to enable continuous updates during slider drag */
  continuousUpdate?: boolean;
}

/**
 * A dual-input component combining a range slider with a number input field.
 * Provides both precise numeric input and intuitive slider-based value selection.
 *
 * Features:
 * - Synchronized slider and number input
 * - Optional continuous update mode for real-time feedback
 * - Warning state styling for validation errors
 * - Optional reference labels below the slider
 * - Accessible with proper ARIA labeling
 *
 * @public
 * @param props - Configuration props for the component
 * @returns JSX element containing the labeled slider input interface
 *
 * @example
 * ```tsx
 * <LabeledSliderInput
 *   label="Border Size"
 *   value={borderSize}
 *   onChange={setBorderSize}
 *   min={0}
 *   max={2}
 *   step={0.1}
 *   labels={['0"', '1"', '2"']}
 *   warning={borderSize < 0.25}
 * />
 * ```
 */
export const LabeledSliderInput = memo(function LabeledSliderInput({
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
});
