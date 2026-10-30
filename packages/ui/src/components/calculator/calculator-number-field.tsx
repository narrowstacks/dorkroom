import { useRef, useState } from 'react';
import { clampText } from '../../lib/clamp-text';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { NumberInput } from '../number-input';

interface CalculatorNumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
  /**
   * Lower bound in display units: native `min` attribute. Out-of-range
   * keystrokes are not committed; blur clamps and commits.
   */
  min?: number;
  /** Upper bound in display units; same semantics as `min`. */
  max?: number;
  unit?: string;
  inputTitle?: string;
  helperText?: string;
  className?: string;
  onBlur?: () => void;
  /** Validation error message rendered under the input, reciprocity-page style. */
  error?: string;
}

export function CalculatorNumberField({
  label,
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  unit,
  inputTitle,
  helperText,
  className,
  onBlur,
  error,
}: CalculatorNumberFieldProps) {
  // Never rendered - only gates the "resync from props" branch below and
  // the blur handler, so a ref (not state) avoids a redraw on every
  // focus/blur that wouldn't change anything on screen.
  const isFocusedRef = useRef(false);
  const [draft, setDraft] = useState(value);

  // While the field is focused, the local draft is authoritative so
  // transitional keystrokes ("-", "1.", "") are never clobbered by a
  // recalculated `value` prop round-tripping back down (the bug this
  // component used to have). Once unfocused, resync from the prop.
  if (!isFocusedRef.current && draft !== value) {
    setDraft(value);
  }

  const handleChangeText = (raw: string) => {
    setDraft(raw);
    const parsed = parseFloat(raw);
    // The draft stays as typed (so "-" -> "-5" isn't fought mid-edit) but
    // out-of-range values are held back rather than clamped per keystroke:
    // with min={10}, typing "25" passes through "2", which must not commit
    // 10. NumberInput's blur clamp commits the in-range value.
    if (Number.isFinite(parsed) && clampText(raw, min, max) === null) {
      onChange(raw);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Out-of-range drafts were already snapped by NumberInput's own blur
    // clamp (which runs first and routes through handleChangeText).
    if (!Number.isFinite(parseFloat(draft))) {
      // Never propagated (nor commit) an unparseable draft - revert the
      // visible text to the last known-good value instead of showing 0.
      setDraft(value);
    }
    onBlur?.();
  };

  return (
    <div className={cn('space-y-2', className)}>
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
      <NumberInput
        value={draft}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        inputTitle={inputTitle ?? `Enter ${label}`}
        className="w-full"
        onBlur={handleBlur}
      />
      {error ? (
        <p
          className="text-xs font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          {error}
        </p>
      ) : (
        helperText && (
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
