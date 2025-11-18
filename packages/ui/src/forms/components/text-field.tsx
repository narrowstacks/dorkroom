import React from 'react';
import { cn } from '../../lib/cn';

export interface TextFieldProps {
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
  type?: string;
  className?: string;
  disabled?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  field,
  label,
  placeholder,
  type = 'text',
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
      <input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
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
    </div>
  );
};
