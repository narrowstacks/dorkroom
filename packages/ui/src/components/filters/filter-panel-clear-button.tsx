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
      className="rounded-lg border border-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary transition-all duration-200 hover:border-accent hover:bg-accent hover:text-background"
    >
      {label}
    </button>
  );
};
