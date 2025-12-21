import type { DevelopmentCombinationView } from '@dorkroom/ui';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';

export interface UseFavoriteActionsProps {
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  animationsEnabled: boolean;
  pageIndex: number;
  setFavoriteTransitions: Dispatch<
    SetStateAction<Map<string, 'adding' | 'removing'>>
  >;
}

export interface UseFavoriteActionsReturn {
  handleCheckFavorite: (view: DevelopmentCombinationView) => boolean;
  handleToggleFavorite: (view: DevelopmentCombinationView) => void;
}

/**
 * Hook for managing favorite actions with animation support.
 * Extracts favorites logic from the main useRecipeActions hook.
 */
export function useFavoriteActions({
  isFavorite,
  toggleFavorite,
  animationsEnabled,
  pageIndex,
  setFavoriteTransitions,
}: UseFavoriteActionsProps): UseFavoriteActionsReturn {
  const transitionTimeoutRefs = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  // Cleanup pending timeouts on unmount to prevent stale state updates
  useEffect(() => {
    const timeouts = transitionTimeoutRefs.current;
    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      timeouts.clear();
    };
  }, []);

  // Memoize favorite callbacks to prevent column recreation on every render
  const handleCheckFavorite = useCallback(
    (view: DevelopmentCombinationView) =>
      isFavorite(String(view.combination.uuid || view.combination.id)),
    [isFavorite]
  );

  const handleToggleFavorite = useCallback(
    (view: DevelopmentCombinationView) => {
      const id = String(view.combination.uuid || view.combination.id);

      if (!animationsEnabled) {
        toggleFavorite(id);
        return;
      }

      // Determine if adding or removing favorite
      const isCurrentlyFavorite = isFavorite(id);
      const transitionType = isCurrentlyFavorite ? 'removing' : 'adding';

      // Add to transition state
      setFavoriteTransitions((prev) => new Map(prev).set(id, transitionType));

      // Clear any existing timeout for this ID
      const existingTimeout = transitionTimeoutRefs.current.get(id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set timeout for skeleton animation duration (500ms)
      const timeout = setTimeout(() => {
        toggleFavorite(id);

        // For off-page items, show message skeleton for 2 seconds after toggle
        if (transitionType === 'adding' && pageIndex > 0) {
          const messageTimeout = setTimeout(() => {
            setFavoriteTransitions((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            transitionTimeoutRefs.current.delete(id);
          }, 2000);
          transitionTimeoutRefs.current.set(id, messageTimeout);
        } else {
          // Remove from transition state after animation completes
          setFavoriteTransitions((prev) => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          transitionTimeoutRefs.current.delete(id);
        }
      }, 500);

      transitionTimeoutRefs.current.set(id, timeout);
    },
    [
      toggleFavorite,
      isFavorite,
      animationsEnabled,
      pageIndex,
      setFavoriteTransitions,
    ]
  );

  return {
    handleCheckFavorite,
    handleToggleFavorite,
  };
}
