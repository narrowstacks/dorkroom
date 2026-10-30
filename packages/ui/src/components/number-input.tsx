import { useState } from 'react';
import { clampText } from '../lib/clamp-text';
import { cn } from '../lib/cn';
import { colorMixOr } from '../lib/color';
import { cssVars } from '../lib/dom';

interface NumberInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  inputTitle?: string;
  step?: number;
  /** Native `min` attribute; out-of-range values are clamped on blur. */
  min?: number;
  /** Native `max` attribute; out-of-range values are clamped on blur. */
  max?: number;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function NumberInput({
  value,
  onChangeText,
  placeholder,
  inputTitle,
  step = 1,
  min,
  max,
  className,
  onFocus,
  onBlur,
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      type="number"
      aria-label={inputTitle ?? placeholder ?? 'Number input'}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
      title={inputTitle}
      step={step}
      min={min}
      max={max}
      className={cn(
        'w-20 rounded-lg border px-3 py-2 focus-visible:outline-none',
        className
      )}
      style={cssVars({
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
        boxShadow: isFocused ? '0 0 0 2px var(--color-focus-ring)' : 'none',
      })}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsFocused(false);
        // Clamp on blur (not per keystroke) so partial input stays editable.
        const clamped = clampText(value, min, max);
        if (clamped !== null) onChangeText(clamped);
        onBlur?.();
      }}
    />
  );
}
