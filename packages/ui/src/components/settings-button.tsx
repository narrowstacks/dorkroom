import { ChevronRight, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../lib/cn';

interface SettingsButtonProps {
  label?: string;
  /** Decorative text after the label (a flag emoji). Hidden from assistive tech. */
  labelDecoration?: string;
  value?: string;
  onPress: () => void;
  icon?: LucideIcon;
  iconClassName?: string;
  showChevron?: boolean;
  centerLabel?: boolean;
  className?: string;
  isSelected?: boolean;
  /**
   * Set when the button is one option of a `SettingsRadioGroup`.
   * It then reports `aria-checked` from `isSelected` and joins the roving
   * tab order (only the checked option is tabbable).
   */
  asRadio?: boolean;
  /**
   * With `asRadio`, also make this option a tab stop. Set it on the first
   * option while nothing in the group is selected, so the group stays reachable.
   */
  tabbable?: boolean;
}

export function SettingsButton({
  label,
  labelDecoration,
  value,
  onPress,
  icon: Icon,
  iconClassName,
  showChevron = true,
  centerLabel = false,
  className,
  isSelected = false,
  asRadio = false,
  tabbable = false,
}: SettingsButtonProps) {
  const labelId = useId();
  const valueId = useId();
  const named = asRadio && Boolean(label);
  return (
    // A button with role="radio" rather than <input type="radio">: it keeps the
    // card styling and onPress; SettingsRadioGroup supplies the radio keyboard
    // behavior. The lint rules preferring a native input are deliberately bypassed
    // via the asRadio prop.
    <button
      type="button"
      role={asRadio ? 'radio' : undefined}
      aria-checked={asRadio ? isSelected : undefined}
      tabIndex={asRadio ? (isSelected || tabbable ? 0 : -1) : undefined}
      aria-labelledby={named ? labelId : undefined}
      aria-describedby={named && value ? valueId : undefined}
      onClick={onPress}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-settings-btn',
        centerLabel && 'max-[374px]:px-2',
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
            centerLabel && 'flex-1 justify-center max-[374px]:gap-1.5'
          )}
        >
          {Icon && (
            <Icon
              className={cn('size-5 shrink-0', iconClassName)}
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          )}
          <div className={cn(centerLabel && 'text-center')}>
            {label && (
              <div
                id={labelId}
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {label}
                {labelDecoration && (
                  <>
                    {' '}
                    <span aria-hidden="true">{labelDecoration}</span>
                  </>
                )}
              </div>
            )}
            {value && (
              <div
                id={valueId}
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
            className="size-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
        )}
      </div>
    </button>
  );
}
