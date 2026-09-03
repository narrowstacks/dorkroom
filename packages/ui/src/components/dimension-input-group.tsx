import { useMeasurement } from '../contexts/measurement-context';
import { cn } from '../lib/cn';
import { cssVars } from '../lib/dom';
import { getUnitLabel } from '../lib/measurement';

interface DimensionInputGroupProps {
  widthValue: string;
  onWidthChange: (value: string) => void;
  heightValue: string;
  onHeightChange: (value: string) => void;
  widthLabel: string;
  heightLabel: string;
  widthPlaceholder?: string;
  heightPlaceholder?: string;
  widthDefault?: string;
  heightDefault?: string;
  className?: string;
  showUnits?: boolean; // Whether to show unit labels
  onWidthBlur?: () => void;
  onHeightBlur?: () => void;
}

export function DimensionInputGroup({
  widthValue,
  onWidthChange,
  heightValue,
  onHeightChange,
  widthLabel,
  heightLabel,
  widthPlaceholder,
  heightPlaceholder,
  className,
  showUnits = true,
  onWidthBlur,
  onHeightBlur,
}: DimensionInputGroupProps) {
  const { unit } = useMeasurement();
  const unitLabel = getUnitLabel(unit);

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <div className="space-y-1.5">
        <label
          htmlFor="dimension-width-input"
          className="block text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {widthLabel}
          {showUnits && ` (${unitLabel})`}
        </label>
        <input
          id="dimension-width-input"
          type="number"
          aria-label={widthLabel}
          value={widthValue}
          onChange={(e) => onWidthChange(e.target.value)}
          placeholder={widthPlaceholder}
          className="w-full rounded-lg border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          style={cssVars({
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-placeholder-color': 'var(--color-text-muted)',
            '--focus-border-color': 'var(--color-border-primary)',
          })}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-border-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-secondary)';
            onWidthBlur?.();
          }}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="dimension-height-input"
          className="block text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {heightLabel}
          {showUnits && ` (${unitLabel})`}
        </label>
        <input
          id="dimension-height-input"
          type="number"
          aria-label={heightLabel}
          value={heightValue}
          onChange={(e) => onHeightChange(e.target.value)}
          placeholder={heightPlaceholder}
          className="w-full rounded-lg border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
          style={cssVars({
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-surface-muted)',
            color: 'var(--color-text-primary)',
            '--tw-placeholder-color': 'var(--color-text-muted)',
            '--focus-border-color': 'var(--color-border-primary)',
          })}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-border-primary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-secondary)';
            onHeightBlur?.();
          }}
        />
      </div>
    </div>
  );
}
