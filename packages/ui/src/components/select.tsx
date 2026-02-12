import type { SelectItem } from '@dorkroom/logic';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

interface SelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
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
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          className="block text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedValue}
          onChange={(e) => onValueChange((e.target as HTMLSelectElement).value)}
          className="w-full appearance-none rounded-lg border px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2"
          aria-label={ariaLabel}
          style={
            {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-primary)',
              '--tw-ring-color': 'var(--color-border-primary)',
            } as React.CSSProperties
          }
          onFocus={(e) =>
            (e.target.style.borderColor = 'var(--color-border-primary)')
          }
          onBlur={(e) =>
            (e.target.style.borderColor = 'var(--color-border-secondary)')
          }
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
              disabled={item.value === '__divider__'}
              style={{
                backgroundColor: 'var(--color-surface)',
                color:
                  item.value === '__divider__'
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-primary)',
              }}
            >
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
    </div>
  );
}
