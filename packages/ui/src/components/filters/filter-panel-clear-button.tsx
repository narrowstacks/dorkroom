import type { FC } from 'react';

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
        e.currentTarget.style.backgroundColor = 'var(--color-accent)';
        e.currentTarget.style.color = 'var(--color-background)';
        e.currentTarget.style.borderColor = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-secondary)';
        e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
      }}
    >
      {label}
    </button>
  );
};
