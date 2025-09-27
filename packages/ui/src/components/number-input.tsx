import { useState } from 'react';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';

interface NumberInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputTitle?: string;
  step?: number;
  className?: string;
}

/**
 * Renders a styled numeric input whose value is controlled as a string.
 *
 * @param value - The current input value represented as a string.
 * @param onChangeText - Callback invoked with the new input string when the value changes.
 * @param placeholder - Placeholder text shown when the input is empty.
 * @param inputTitle - Title attribute for the input element.
 * @param step - The numeric step increment for the input (defaults to 1).
 * @param className - Additional CSS class names to apply to the input.
 * @returns The rendered number input element.
 */
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
        backgroundColor: colorMixOr(
          'var(--color-surface)',
          20,
          'transparent',
          'var(--color-surface)'
        ),
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
