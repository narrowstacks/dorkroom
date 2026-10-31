import type React from 'react';
import { cn } from '../../lib/cn';
import { formatFieldErrors } from '../utils/format-field-errors';

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
          aria-label={label ?? field.name}
          checked={field.state.value}
          onChange={(e) => field.handleChange(e.target.checked)}
          onBlur={field.handleBlur}
          disabled={disabled}
          className={cn(
            'w-4 h-4 rounded',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          style={{
            accentColor: 'var(--color-brand)',
            borderColor: showErrors
              ? 'var(--color-semantic-error)'
              : 'var(--color-border-primary)',
          }}
        />
        {label && (
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {label}
          </span>
        )}
      </label>
      {showErrors && (
        <p className="text-sm" style={{ color: 'var(--color-semantic-error)' }}>
          {formatFieldErrors(field.state.meta.errors)}
        </p>
      )}
    </div>
  );
};
