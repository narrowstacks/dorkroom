import React from 'react';
import { cn } from '../../lib/cn';

export interface CheckboxFieldProps {
  field: {
    name: string;
    state: {
      value: boolean;
      meta: {
        errors: unknown[];
        isTouched?: boolean;
        isDirty?: boolean;
        isValidating?: boolean;
      };
    };
    handleChange: (value: boolean) => void;
    handleBlur: () => void;
  };
  label?: string;
  className?: string;
  disabled?: boolean;
}

const normalizeErrors = (errors: unknown[]): string => {
  if (!Array.isArray(errors)) {
    return '';
  }

  const errorStrings = errors
    .filter((e) => e !== null && e !== undefined)
    .map((error) => {
      if (typeof error === 'string') {
        return error;
      }
      if (error instanceof Error) {
        return error.message;
      }
      return String(error);
    });

  return errorStrings.join(', ');
};

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  field,
  label,
  className,
  disabled = false,
}) => {
  const showErrors =
    field.state.meta.errors.length > 0 &&
    (field.state.meta.isTouched || field.state.meta.isDirty);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.name} className="flex items-center gap-2">
        <input
          id={field.name}
          name={field.name}
          type="checkbox"
          checked={field.state.value}
          onChange={(e) => field.handleChange(e.target.checked)}
          onBlur={field.handleBlur}
          disabled={disabled}
          className={cn(
            'w-4 h-4 border border-gray-300 rounded',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            showErrors && 'border-red-500 focus:ring-red-500',
            className
          )}
        />
        {label && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
      </label>
      {showErrors && (
        <p className="text-sm text-red-600">
          {normalizeErrors(field.state.meta.errors)}
        </p>
      )}
    </div>
  );
};
