import { NumberInput } from '../number-input';
import { cn } from '../../lib/cn';

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
      <div className="flex items-center justify-between text-sm text-white/90">
        <span className="font-medium">{label}</span>
        {unit && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">
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
      {helperText && <p className="text-xs text-white/60">{helperText}</p>}
    </div>
  );
}
