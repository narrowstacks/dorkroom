import type { SelectItem } from '@dorkroom/logic';
import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../lib/cn';
import { cssVars } from '../lib/dom';

interface SelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: readonly SelectItem[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Build a change handler that reports the option table's own value type: a
 * `<select>` hands back a plain string, so look it up in the rendered options.
 */
export function optionChangeHandler<TValue extends string>(
  items: readonly { readonly value: TValue }[],
  onChange: (value: TValue) => void
): (value: string) => void {
  return (value) => {
    const item = items.find((candidate) => candidate.value === value);
    if (item) {
      onChange(item.value);
    }
  };
}

export function Select({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder,
  className,
  ariaLabel,
}: SelectProps) {
  const selectId = useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={selectedValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full appearance-none rounded-lg border px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2"
          aria-label={ariaLabel}
          style={cssVars({
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-ring-color': 'var(--color-border-primary)',
          })}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-border-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-secondary)';
          }}
        >
          {placeholder && !selectedValue && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {items.map((item) => (
            <option
              key={item.value}
              value={item.value}
              disabled={item.value.startsWith('__divider')}
              style={{
                backgroundColor: 'var(--color-surface)',
                color: item.value.startsWith('__divider')
                  ? 'var(--color-text-tertiary)'
                  : 'var(--color-text-primary)',
              }}
            >
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 size-4 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
    </div>
  );
}
