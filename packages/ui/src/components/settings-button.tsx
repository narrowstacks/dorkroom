import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

interface SettingsButtonProps {
  label?: string;
  value?: string;
  onPress: () => void;
  icon?: LucideIcon;
  iconClassName?: string;
  showChevron?: boolean;
  centerLabel?: boolean;
  className?: string;
  isSelected?: boolean;
}

export function SettingsButton({
  label,
  value,
  onPress,
  icon: Icon,
  iconClassName,
  showChevron = true,
  centerLabel = false,
  className,
  isSelected = false,
}: SettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors focus:outline-none focus:ring-2 hoverable-settings-btn',
        isSelected && 'settings-btn-selected',
        className
      )}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: isSelected
          ? 'rgba(var(--color-background-rgb), 0.2)'
          : 'rgba(var(--color-background-rgb), 0.1)',
        outline: isSelected
          ? '2px solid var(--color-border-primary)'
          : 'var(--settings-button-outline-inactive, none)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex items-center gap-3',
            centerLabel && 'flex-1 justify-center'
          )}
        >
          {Icon && (
            <Icon
              className={cn('h-5 w-5 shrink-0', iconClassName)}
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          )}
          <div className={cn(centerLabel && 'text-center')}>
            {label && (
              <div
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {label}
              </div>
            )}
            {value && (
              <div
                className={cn('text-sm', !label && 'font-medium')}
                style={{
                  color: !label
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                }}
              >
                {value}
              </div>
            )}
          </div>
        </div>
        {showChevron && !centerLabel && (
          <ChevronRight
            className="h-4 w-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
        )}
      </div>
    </button>
  );
}
