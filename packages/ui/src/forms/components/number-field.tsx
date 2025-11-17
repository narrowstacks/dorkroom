import React from 'react';
import { cn } from '../../lib/cn';

export interface NumberFieldProps {
  field: {
    name: string;
    state: {
      value: number;
      meta: {
        errors: unknown[];
        isTouched?: boolean;
        isDirty?: boolean;
        isValidating?: boolean;
      };
    };
    handleChange: (value: number) => void;
    handleBlur: () => void;
  };
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  showWarning?: boolean;
  warning?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  field,
  label,
  placeholder,
  min,
  max,
  step = 1,
  className,
  disabled = false,
  showWarning = false,
  warning,
}) => {
  const showErrors =
    field.state.meta.errors.length > 0 &&
    (field.state.meta.isTouched || field.state.meta.isDirty);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={field.name}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={field.name}
        name={field.name}
        type="number"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.valueAsNumber)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          'px-3 py-2 border border-gray-300 rounded-md',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          showErrors && 'border-red-500 focus:ring-red-500',
          className
        )}
      />
      {showErrors && (
        <p className="text-sm text-red-600">
          {field.state.meta.errors.join(', ')}
        </p>
      )}
      {showWarning && warning && (
        <p className="text-sm text-amber-600">⚠ {warning}</p>
      )}
    </div>
  );
};
