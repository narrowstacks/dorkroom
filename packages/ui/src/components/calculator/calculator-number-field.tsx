import { useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';
import { NumberInput } from '../number-input';

interface CalculatorNumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
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
    if (Number.isFinite(parsed)) {
      onChange(raw);
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
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
