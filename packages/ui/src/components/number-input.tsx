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
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 20%, transparent)',
        color: 'var(--color-text-primary)',
      } as React.CSSProperties}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--color-border-primary)';
        e.target.style.boxShadow = '0 0 0 2px var(--color-border-muted)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--color-border-secondary)';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
}
