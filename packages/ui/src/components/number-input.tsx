import { useState } from 'react';
import { cn } from '../lib/cn';

interface NumberInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputTitle?: string;
  step?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChangeText,
  placeholder,
  inputTitle,
  step = 1,
  className,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChangeText((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      title={inputTitle}
      step={step}
      className={cn(
        'w-20 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2',
        className
      )}
      style={{
        borderColor: isFocused 
          ? 'var(--color-border-primary)' 
          : 'var(--color-border-secondary)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 20%, transparent)',
        color: 'var(--color-text-primary)',
        boxShadow: isFocused 
          ? '0 0 0 2px var(--color-border-muted)' 
          : 'none',
      } as React.CSSProperties}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
}
