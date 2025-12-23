import { createContext, useContext } from 'react';

interface FilterPanelContextValue {
  isCollapsed: boolean;
  toggle: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

export const FilterPanelContext = createContext<FilterPanelContextValue | null>(
  null
);

export function useFilterPanel() {
  const context = useContext(FilterPanelContext);
  if (!context) {
    throw new Error(
      'useFilterPanel must be used within a FilterPanelContainer'
    );
  }
  return context;
}
