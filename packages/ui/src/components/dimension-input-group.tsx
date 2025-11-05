import { cn } from '../lib/cn';
import { useMeasurement } from '../contexts/measurement-context';
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
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {widthLabel}
          {showUnits && ` (${unitLabel})`}
        </label>
        <input
          type="number"
          value={widthValue}
          onChange={(e) => onWidthChange((e.target as HTMLInputElement).value)}
          placeholder={widthPlaceholder}
          className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
          style={
            {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-primary)',
              '--tw-placeholder-color': 'var(--color-text-muted)',
              '--tw-ring-color': 'var(--color-border-primary)',
              '--focus-border-color': 'var(--color-border-primary)',
            } as React.CSSProperties
          }
          onFocus={(e) =>
            (e.target.style.borderColor = 'var(--color-border-primary)')
          }
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-secondary)';
            onWidthBlur?.();
          }}
        />
      </div>
      <div className="space-y-2">
        <label
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {heightLabel}
          {showUnits && ` (${unitLabel})`}
        </label>
        <input
          type="number"
          value={heightValue}
          onChange={(e) => onHeightChange((e.target as HTMLInputElement).value)}
          placeholder={heightPlaceholder}
          className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
          style={
            {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              color: 'var(--color-text-primary)',
              '--tw-placeholder-color': 'var(--color-text-muted)',
              '--tw-ring-color': 'var(--color-border-primary)',
              '--focus-border-color': 'var(--color-border-primary)',
            } as React.CSSProperties
          }
          onFocus={(e) =>
            (e.target.style.borderColor = 'var(--color-border-primary)')
          }
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border-secondary)';
            onHeightBlur?.();
          }}
        />
      </div>
    </div>
  );
}
