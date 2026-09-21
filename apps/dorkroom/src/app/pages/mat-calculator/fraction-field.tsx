import { getDisplayUnitLabel } from '@dorkroom/logic';
import { colorMixOr, useMeasurement } from '@dorkroom/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import {
  matDisplayToValue,
  matStepLabel,
  matValueToDisplay,
  stepMatDisplay,
} from './mat-units';

interface FractionFieldProps {
  label: string;
  /** The measurement in inches — always, whatever the display unit is. */
  value: string;
  /** Receives the measurement in inches. */
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  helperText?: string;
  className?: string;
}

/**
 * Text input styled like the dorkroom CalculatorNumberField, but accepts
 * fraction entry ("3 1/2", "1/4") which is how matting is measured in the shop.
 * Up/down arrow keys and the tap steppers nudge the value by one notch of the
 * active unit: 1/16" in imperial, 1mm in metric.
 *
 * `value`/`onChange` are always inches; when the global preference is metric
 * the field shows and accepts centimetres and converts at this boundary, so
 * form state and persistence never change unit.
 */
export function FractionField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  helperText,
  className,
}: FractionFieldProps) {
  const { unit: measurementUnit } = useMeasurement();
  const [isFocused, setIsFocused] = useState(false);
  const isMetric = measurementUnit === 'metric';
  const converted = matValueToDisplay(value, measurementUnit);

  // Metric only: while the field is focused the local draft is authoritative,
  // so transitional keystrokes ("20.", "") survive the trip through inches and
  // back instead of being clobbered by the reconverted prop. Imperial keeps
  // rendering `value` verbatim — the conversion is the identity there.
  const [draft, setDraft] = useState(converted);
  if (isMetric && !isFocused && draft !== converted) {
    setDraft(converted);
  }
  const displayValue = isMetric ? draft : value;
  const unitLabel = unit ?? getDisplayUnitLabel(measurementUnit);
  const stepLabel = matStepLabel(measurementUnit);

  const commit = (raw: string) => {
    if (isMetric) {
      setDraft(raw);
    }
    onChange(matDisplayToValue(raw, measurementUnit));
  };

  const nudge = (direction: 1 | -1) =>
    commit(stepMatDisplay(displayValue, measurementUnit, direction));

  return (
    <div className={`min-w-0 space-y-2 ${className ?? ''}`}>
      <div
        className="flex items-center justify-between text-sm"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <span className="font-medium">{label}</span>
        {unitLabel && (
          <span
            className="flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase"
            style={{
              borderColor: 'var(--color-border-muted)',
              backgroundColor: colorMixOr(
                'var(--color-surface)',
                20,
                'transparent',
                'var(--color-surface)'
              ),
              color: 'var(--color-text-tertiary)',
            }}
          >
            {unitLabel}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={displayValue}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              nudge(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              nudge(-1);
            }
          }}
          placeholder={placeholder}
          title={`Enter ${label}`}
          className="w-full rounded-lg border py-2 pl-3 pr-11 font-mono focus:outline-none"
          style={{
            borderColor: isFocused
              ? 'var(--color-border-primary)'
              : 'var(--color-border-secondary)',
            backgroundColor: colorMixOr(
              'var(--color-surface)',
              20,
              'transparent',
              'var(--color-surface)'
            ),
            color: 'var(--color-text-primary)',
            boxShadow: isFocused
              ? '0 0 0 2px var(--color-border-muted)'
              : 'none',
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <div className="absolute inset-y-1 right-1 flex flex-col overflow-hidden rounded-md">
          <StepperButton
            label={`Increase ${label} by ${stepLabel}`}
            onTap={() => nudge(1)}
          >
            <ChevronUp className="size-3.5" />
          </StepperButton>
          <StepperButton
            label={`Decrease ${label} by ${stepLabel}`}
            onTap={() => nudge(-1)}
          >
            <ChevronDown className="size-3.5" />
          </StepperButton>
        </div>
      </div>
      {helperText && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

interface StepperButtonProps {
  label: string;
  onTap: () => void;
  children: ReactNode;
}

function StepperButton({ label, onTap, children }: StepperButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Keep focus on the input so the value isn't committed/blurred on tap.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onTap}
      className="flex h-1/2 w-8 items-center justify-center transition-colors active:opacity-70"
      style={{
        color: 'var(--color-text-tertiary)',
        backgroundColor: colorMixOr(
          'var(--color-surface)',
          40,
          'transparent',
          'var(--color-surface)'
        ),
      }}
    >
      {children}
    </button>
  );
}
