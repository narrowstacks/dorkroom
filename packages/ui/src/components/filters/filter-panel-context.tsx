import { createContext, type Ref, use } from 'react';

interface FilterPanelContextValue {
  isCollapsed: boolean;
  toggle: () => void;
  /** Id of the panel region the toggles control (aria-controls). */
  panelId: string;
  /** Ref for the collapse toggle in the header, so focus can return to it. */
  collapseButtonRef: Ref<HTMLButtonElement>;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

export const FilterPanelContext = createContext<FilterPanelContextValue | null>(
  null
);

export function useFilterPanel() {
  const context = use(FilterPanelContext);
  if (!context) {
    throw new Error(
      'useFilterPanel must be used within a FilterPanelContainer'
    );
  }
  return context;
}
