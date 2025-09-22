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
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-transparent',
          value ? 'bg-white' : 'bg-white/20'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            value ? 'translate-x-6 bg-black' : 'translate-x-1'
          )}
        />
      </button>
      <label className="text-sm font-medium text-white/90">{label}</label>
    </div>
  );
}