import React from 'react';
import { FieldApi } from '@tanstack/react-form';
import { cn } from '../../lib/cn';
import { colorMixOr } from '../../lib/color';

export interface TanStackTextInputProps {
  field: FieldApi<any, string, any, any>;
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
  const hasErrors = field.state.meta.errors.length > 0;

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
        className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
        style={
          {
            borderColor: hasErrors
              ? colorMixOr('var(--color-semantic-error)', 50, 'var(--color-border-primary)', 'var(--color-border-secondary)')
              : 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-placeholder-color': 'var(--color-text-muted)',
            '--tw-ring-color': hasErrors
              ? colorMixOr('var(--color-semantic-error)', 30, 'var(--color-border-primary)', 'var(--color-border-secondary)')
              : 'var(--color-border-primary)',
          } as React.CSSProperties
        }
        onFocus={(e) => {
          e.currentTarget.style.borderColor = hasErrors
            ? colorMixOr('var(--color-semantic-error)', 50, 'var(--color-border-primary)', 'var(--color-border-secondary)')
            : 'var(--color-border-primary)';
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = hasErrors
            ? colorMixOr('var(--color-semantic-error)', 50, 'var(--color-border-primary)', 'var(--color-border-secondary)')
            : 'var(--color-border-secondary)';
        }}
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
          {field.state.meta.errors.join(', ')}
        </div>
      )}
    </div>
  );
};
