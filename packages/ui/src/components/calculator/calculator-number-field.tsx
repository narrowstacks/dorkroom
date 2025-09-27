import { NumberInput } from '../number-input';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

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
}

/**
 * Renders a labeled numeric input field with an optional unit badge and helper text.
 *
 * @param label - Visible label displayed above the input.
 * @param value - Current input value as a string.
 * @param onChange - Callback invoked with the new text when the input changes.
 * @param placeholder - Placeholder text shown when the input is empty.
 * @param step - Numeric step increment/decrement applied by the input controls.
 * @param unit - Optional unit string displayed in a small badge to the right of the label.
 * @param inputTitle - Title attribute for the input; defaults to `Enter {label}` when not provided.
 * @param helperText - Optional explanatory text rendered below the input.
 * @param className - Additional CSS classes applied to the root container.
 * @returns A JSX element representing the calculator number field.
 */
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
}: CalculatorNumberFieldProps) {
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
              backgroundColor: colorMixOr('var(--color-surface)', 20, 'transparent', 'var(--color-surface)'),
              color: 'var(--color-text-tertiary)',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      <NumberInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        step={step}
        inputTitle={inputTitle ?? `Enter ${label}`}
        className="w-full"
      />
      {helperText && (
        <p 
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
