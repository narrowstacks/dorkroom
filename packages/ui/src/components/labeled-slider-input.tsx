import type { ChangeEvent } from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';

/**
 * A label entry for the slider. Strings are spaced evenly across the track
 * (legacy behavior). Objects with `value` are positioned at the percentage
 * corresponding to that value, so the label sits directly under the thumb
 * when the slider is set to that value.
 *
 * @public
 */
export type SliderLabel = string | { text: string; value: number };

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
  labels?: SliderLabel[];
  /** Optional CSS class name for styling customization */
  className?: string;
  /** Whether to display warning styling (yellow border/background) */
  warning?: boolean;
  /** Whether to enable continuous updates during slider drag */
  continuousUpdate?: boolean;
}

// Native range thumb is 16px (8px radius). Compensating shifts label centers
// to align with the thumb center rather than the track edges.
const SLIDER_THUMB_RADIUS_PX = 8;

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
}: LabeledSliderInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputId = useId();
  const rangeId = `${inputId}-range`;

  // Track local slider value during drag so the slider visually updates
  // immediately, while parent state updates are RAF-throttled.
  const [localSliderValue, setLocalSliderValue] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const handleSliderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      // Update local value immediately so the slider thumb tracks the finger
      setLocalSliderValue(newValue);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        onSliderChange?.(newValue);
        rafRef.current = 0;
      });
    },
    [onSliderChange]
  );

  // Clear local override when parent value catches up
  if (localSliderValue !== null && localSliderValue === value) {
    setLocalSliderValue(null);
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat((e.target as HTMLInputElement).value) || 0;
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-2')}>
      <div className={cn('flex items-center justify-between', className)}>
        <label
          htmlFor={inputId}
          id={`${inputId}-label`}
          className="text-xs font-medium"
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

      <div className="space-y-1">
        <input
          type="range"
          id={rangeId}
          min={min}
          max={max}
          step={step}
          value={localSliderValue ?? value}
          onChange={handleSliderChange}
          aria-labelledby={`${inputId}-label`}
          className={cn(
            'w-full h-2 rounded-lg appearance-none cursor-pointer slider-track',
            warning && 'bg-yellow-500/20'
          )}
        />

        {labels.length > 0 &&
          (typeof labels[0] === 'string' ? (
            <div
              className="flex justify-between text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {(labels as string[]).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          ) : (
            <div
              className="relative h-4 text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {(labels as Array<{ text: string; value: number }>).map(
                ({ text, value: labelValue }) => {
                  const pct =
                    max === min ? 0 : (labelValue - min) / (max - min);
                  const offsetPx = (1 - 2 * pct) * SLIDER_THUMB_RADIUS_PX;
                  return (
                    <span
                      key={text}
                      className="absolute -translate-x-1/2"
                      style={{ left: `calc(${pct * 100}% + ${offsetPx}px)` }}
                    >
                      {text}
                    </span>
                  );
                }
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
