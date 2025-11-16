import React from 'react';
import { cn } from '../../lib/cn';

export interface SelectFieldProps {
  field: {
    name: string;
    state: {
      value: string;
      meta: {
        errors: unknown[];
        isTouched?: boolean;
        isDirty?: boolean;
        isValidating?: boolean;
      };
    };
    handleChange: (value: string) => void;
    handleBlur: () => void;
  };
  label?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  field,
  label,
  placeholder,
  options,
  className,
  disabled = false,
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
      <select
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        className={cn(
          'px-3 py-2 border border-gray-300 rounded-md',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          'bg-white',
          showErrors && 'border-red-500 focus:ring-red-500',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showErrors && (
        <p className="text-sm text-red-600">
          {field.state.meta.errors.map(String).join(', ')}
        </p>
      )}
    </div>
  );
};
