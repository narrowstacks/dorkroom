import { cn } from '../lib/cn';

interface ToggleSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  className?: string;
}

export function ToggleSwitch({
  label,
  value,
  onValueChange,
  className,
}: ToggleSwitchProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => onValueChange(!value)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          'focus:ring-primary/40 focus:ring-offset-transparent'
        )}
        style={{
          backgroundColor: value
            ? 'var(--color-secondary)'
            : 'var(--color-border-primary)',
          border: value
            ? 'var(--toggle-pill-border-active, none)'
            : 'var(--toggle-pill-border, none)',
        }}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full transition-transform',
            value ? 'translate-x-6' : 'translate-x-1'
          )}
          style={{
            backgroundColor: value 
              ? 'var(--color-background)' 
              : 'var(--color-text-primary)',
            border: value
              ? 'var(--toggle-circle-border-active, none)'
              : 'var(--toggle-circle-border, none)',
          }}
        />
      </button>
      <label
        className="text-sm font-medium cursor-pointer"
        style={{ color: 'var(--color-text-primary)' }}
        onClick={() => onValueChange(!value)}
      >
        {label}
      </label>
    </div>
  );
}
