import { recipeIdOf } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { useCallback } from 'react';
import { trackEvent } from '../../../lib/analytics/tracked-events';

export interface UseFavoriteActionsProps {
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

export interface UseFavoriteActionsReturn {
  handleCheckFavorite: (view: DevelopmentCombinationView) => boolean;
  handleToggleFavorite: (view: DevelopmentCombinationView) => void;
}

/**
 * Save and unsave a recipe, reporting `favorite_toggled`. The toggle applies
 * at once.
 */
export function useFavoriteActions({
  isFavorite,
  toggleFavorite,
}: UseFavoriteActionsProps): UseFavoriteActionsReturn {
  const handleCheckFavorite = useCallback(
    (view: DevelopmentCombinationView) => isFavorite(recipeIdOf(view)),
    [isFavorite]
  );

  const handleToggleFavorite = useCallback(
    (view: DevelopmentCombinationView) => {
      const id = recipeIdOf(view);
      trackEvent('favorite_toggled', { added: !isFavorite(id) });
      toggleFavorite(id);
    },
    [toggleFavorite, isFavorite]
  );

  return { handleCheckFavorite, handleToggleFavorite };
}
