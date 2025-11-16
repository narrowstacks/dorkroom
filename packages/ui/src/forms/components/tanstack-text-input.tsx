import React from 'react';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

export interface TanStackTextInputProps {
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
  description?: string;
  placeholder?: string;
  className?: string;
  type?: string;
}

export const TanStackTextInput: React.FC<TanStackTextInputProps> = ({
  field,
  label,
  description,
  placeholder,
  className,
  type = 'text',
}) => {
  const meta = field.state.meta;
  const hasErrors =
    (meta.errors as Array<string | unknown>).length > 0 &&
    (meta.isTouched || meta.isDirty);

  // Compute border colors based on current hasErrors value (every render)
  const borderColorError = colorMixOr(
    'var(--color-semantic-error)',
    50,
    'var(--color-border-primary)',
    'var(--color-border-secondary)'
  );
  const ringColorError = colorMixOr(
    'var(--color-semantic-error)',
    30,
    'var(--color-border-primary)',
    'var(--color-border-secondary)'
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={field.name}
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <input
        id={field.name}
        name={field.name}
        type={type}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        className={cn('tanstack-text-input w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2', {
          'tanstack-text-input--error': hasErrors,
        })}
        style={
          {
            '--border-color': hasErrors
              ? borderColorError
              : 'var(--color-border-secondary)',
            '--border-color-focused': hasErrors
              ? borderColorError
              : 'var(--color-border-primary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-placeholder-color': 'var(--color-text-muted)',
            '--tw-ring-color': hasErrors ? ringColorError : 'var(--color-border-primary)',
          } as React.CSSProperties
        }
      />
      {hasErrors && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: colorMixOr(
              'var(--color-semantic-error)',
              20,
              'transparent',
              'var(--color-border-secondary)'
            ),
            backgroundColor: colorMixOr(
              'var(--color-semantic-error)',
              10,
              'transparent',
              'var(--color-border-muted)'
            ),
            color: colorMixOr(
              'var(--color-semantic-error)',
              80,
              'var(--color-text-primary)',
              'var(--color-semantic-error)'
            ),
          }}
        >
          {field.state.meta.errors.map((e) => String(e)).join(', ')}
        </div>
      )}
      <style>{`
        .tanstack-text-input {
          border-color: var(--border-color);
        }

        .tanstack-text-input:focus-visible {
          border-color: var(--border-color-focused);
        }
      `}</style>
    </div>
  );
};
