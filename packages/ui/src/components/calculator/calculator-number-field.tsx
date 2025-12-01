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
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        step={step}
        inputTitle={inputTitle ?? `Enter ${label}`}
        className="w-full"
        onBlur={onBlur}
      />
      {helperText && (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
