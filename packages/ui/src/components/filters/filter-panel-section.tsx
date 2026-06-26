import type { FC, ReactNode } from 'react';
import { FilterPanelClearButton } from './filter-panel-clear-button';

interface FilterPanelSectionProps {
  children: ReactNode;
  /** Section title */
  title?: string;
  /** Callback when clear button is clicked */
  onClear?: () => void;
  /** Show clear button (default: false) */
  showClear?: boolean;
  /** Text for clear button (default: "Clear all") */
  clearLabel?: string;
}

export const FilterPanelSection: FC<FilterPanelSectionProps> = ({
  children,
  title,
  onClear,
  showClear = false,
  clearLabel = 'Clear all',
}) => {
  return (
    <div
      className="relative rounded-2xl border p-4 shadow-subtle card-grain"
      style={
        {
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
          // Dark, translucent surface — keep the grain barely-there.
          '--card-grain-opacity': '0.22',
          // Blend the grain against this surface's own base colour.
          '--card-grain-base': 'var(--color-background)',
        } as React.CSSProperties
      }
    >
      <div className="relative z-10 space-y-4">
        {title && (
          <div className="flex items-center justify-between">
            <h3
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <div
                className="size-1 rounded-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              {title}
            </h3>
            {showClear && onClear && (
              <FilterPanelClearButton onClick={onClear} label={clearLabel} />
            )}
          </div>
        )}

        <div className="space-y-3.5">{children}</div>
      </div>
    </div>
  );
};
