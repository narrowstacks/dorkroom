import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import type { SelectItem } from '@dorkroom/logic';

interface SelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: SelectItem[];
  placeholder?: string;
  className?: string;
}

export function Select({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder,
  className,
}: SelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={selectedValue}
          onChange={(e) => onValueChange((e.target as HTMLSelectElement).value)}
          className="w-full appearance-none rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-8 text-white focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
              className={cn(
                'bg-black text-white',
                item.value === '__divider__' && 'text-white/30'
              )}
            >
              {item.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50 pointer-events-none" />
      </div>
    </div>
  );
}
