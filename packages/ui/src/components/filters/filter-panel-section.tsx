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
      className="space-y-4 rounded-xl border p-4 shadow-md"
      style={{
        borderColor: 'var(--color-border-primary)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {title && (
        <div className="flex items-center justify-between">
          <h3
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <div
              className="h-1 w-1 rounded-full"
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
  );
};
