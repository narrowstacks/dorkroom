import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

interface SettingsButtonProps {
  label?: string;
  value?: string;
  onPress: () => void;
  icon?: LucideIcon;
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
  showChevron = true,
  centerLabel = false,
  className,
  isSelected = false,
}: SettingsButtonProps) {
  return (
    <button
      onClick={onPress}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors focus:outline-none focus:ring-2',
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
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          'rgba(var(--color-background-rgb), 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected
          ? 'rgba(var(--color-background-rgb), 0.1)'
          : 'rgba(var(--color-background-rgb), 0.05)';
      }}
      onFocus={(e) => {
        if (!isSelected) {
          e.currentTarget.style.outline =
            '2px solid var(--color-border-primary)';
        }
      }}
      onBlur={(e) => {
        if (!isSelected) {
          e.currentTarget.style.outline = 'var(--settings-button-outline-inactive, none)';
        }
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
              className="h-5 w-5"
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
