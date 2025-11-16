import React from 'react';
import { FieldApi } from '@tanstack/react-form';
import { cn } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TextareaFieldProps {
  field: FieldApi<any, string, any, any>;
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  field,
  label,
  placeholder,
  rows = 3,
  className,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={twMerge(
          cn(
            'px-3 py-2 border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'resize-none',
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
    </div>
  );
};
