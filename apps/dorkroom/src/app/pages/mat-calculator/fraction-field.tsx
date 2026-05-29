import { parseMatInput, toFractionInput } from '@dorkroom/logic';
import { colorMixOr } from '@dorkroom/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface FractionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  helperText?: string;
  className?: string;
}

/** Increment step for the up/down steppers and arrow keys: 1/16 inch. */
const STEP = 1 / 16;

/** Snap the current value to the 1/16 grid and step by one notch (clamped at 0). */
function step(value: string, direction: 1 | -1): string {
  const current = parseMatInput(value);
  const base = Number.isNaN(current) ? 0 : current;
  const snapped = Math.round(base / STEP) * STEP;
  const next = Math.max(0, snapped + direction * STEP);
  return toFractionInput(next);
}

/**
 * Text input styled like the dorkroom CalculatorNumberField, but accepts
 * fraction entry ("3 1/2", "1/4") which is how matting is measured in the shop.
 * Up/down arrow keys and the tap steppers nudge the value by 1/16".
 */
export function FractionField({
  label,
  value,
  onChange,
  placeholder,
  unit = 'in',
  helperText,
  className,
}: FractionFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const nudge = (direction: 1 | -1) => onChange(step(value, direction));

  return (
    <div className={`min-w-0 space-y-2 ${className ?? ''}`}>
      <div
        className="flex items-center justify-between text-sm"
        style={{ color: 'var(--color-text-primary)' }}
      >
        <span className="font-medium">{label}</span>
        {unit && (
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
            {unit}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
            label={`Increase ${label} by 1/16 inch`}
            onTap={() => nudge(1)}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </StepperButton>
          <StepperButton
            label={`Decrease ${label} by 1/16 inch`}
            onTap={() => nudge(-1)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
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
