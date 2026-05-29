import type { FC } from 'react';
import { setStyles } from '../../lib/dom';

interface FilterPanelClearButtonProps {
  onClick: () => void;
  /** Button label (default: "Clear all") */
  label?: string;
}

export const FilterPanelClearButton: FC<FilterPanelClearButtonProps> = ({
  onClick,
  label = 'Clear all',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200"
      style={{
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border-secondary)',
      }}
      onMouseEnter={(e) => {
        setStyles(e.currentTarget, {
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-background)',
          borderColor: 'var(--color-accent)',
        });
      }}
      onMouseLeave={(e) => {
        setStyles(e.currentTarget, {
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-secondary)',
        });
      }}
    >
      {label}
    </button>
  );
};
