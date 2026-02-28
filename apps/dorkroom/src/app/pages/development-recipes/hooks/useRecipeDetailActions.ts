import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

export interface UseRecipeDetailActionsProps {
  setDetailView: Dispatch<SetStateAction<DevelopmentCombinationView | null>>;
  setIsDetailOpen: Dispatch<SetStateAction<boolean>>;
  setIsFiltersSidebarCollapsed?: Dispatch<SetStateAction<boolean>>;
}

export interface UseRecipeDetailActionsReturn {
  handleOpenDetail: (view: DevelopmentCombinationView) => void;
}

/**
 * Hook for managing detail drawer actions.
 * Extracts the detail modal logic from the main useRecipeActions hook.
 */
export function useRecipeDetailActions({
  setDetailView,
  setIsDetailOpen,
  setIsFiltersSidebarCollapsed,
}: UseRecipeDetailActionsProps): UseRecipeDetailActionsReturn {
  const handleOpenDetail = useCallback(
    (view: DevelopmentCombinationView) => {
      setDetailView(view);
      setIsDetailOpen(true);
      setIsFiltersSidebarCollapsed?.(true);
    },
    [setDetailView, setIsDetailOpen, setIsFiltersSidebarCollapsed]
  );

  return { handleOpenDetail };
}
