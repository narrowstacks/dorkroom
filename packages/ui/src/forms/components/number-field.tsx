import React from 'react';
import { FieldApi } from '@tanstack/react-form';
import { cn } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NumberFieldProps {
  field: FieldApi<any, number, any, any>;
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
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
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
        className={twMerge(
          cn(
            'px-3 py-2 border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            field.state.meta.errors.length > 0 && 'border-red-500 focus:ring-red-500'
          ),
          className
        )}
      />
      {field.state.meta.errors.length > 0 && (
        <p className="text-sm text-red-600">
          {field.state.meta.errors.join(', ')}
        </p>
      )}
      {showWarning && warning && (
        <p className="text-sm text-amber-600">
          ⚠ {warning}
        </p>
      )}
    </div>
  );
};
