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

/**
 * Renders a configurable settings button row with optional icon, label, value, and chevron.
 *
 * The button reflects interaction and selection states (hover, focus, selected) and can center its content.
 *
 * @param label - Optional heading text shown above the value.
 * @param value - Optional secondary text displayed beneath or beside the label.
 * @param onPress - Click handler invoked when the button is activated.
 * @param icon - Optional icon component to display at the start of the row.
 * @param showChevron - If true, displays a right chevron unless `centerLabel` is true.
 * @param centerLabel - If true, centers the label/value and hides the chevron.
 * @param className - Additional class names applied to the button element.
 * @param isSelected - If true, applies selected styling and a prominent outline.
 * @returns The rendered settings-style button element.
 */
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
