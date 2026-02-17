import { useId } from 'react';
import { cn } from '../lib/cn';

interface TextInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  description?: string;
  inputMode?:
    | 'text'
    | 'decimal'
    | 'numeric'
    | 'tel'
    | 'search'
    | 'email'
    | 'url';
}

export function TextInput({
  value,
  onValueChange,
  placeholder,
  label,
  className,
  description,
  inputMode,
}: TextInputProps) {
  const id = useId();

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onValueChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
        style={
          {
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-placeholder-color': 'var(--color-text-muted)',
            '--tw-ring-color': 'var(--color-border-primary)',
          } as React.CSSProperties
        }
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-border-primary)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border-secondary)';
        }}
      />
    </div>
  );
}
