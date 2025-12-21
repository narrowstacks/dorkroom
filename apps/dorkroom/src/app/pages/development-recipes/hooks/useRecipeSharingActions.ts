import type { CustomRecipe } from '@dorkroom/logic';
import { debugError } from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { useCallback } from 'react';

/**
 * Internal result type from sharing functions.
 * Different from @dorkroom/ui ShareResult which is for the ShareButton component.
 */
interface SharingResult {
  success: boolean;
  method?: 'clipboard' | 'webShare';
  showToast?: boolean;
  error?: string;
}

export interface UseRecipeSharingActionsProps {
  customRecipes: CustomRecipe[];
  shareCustomRecipe: (params: {
    recipe: CustomRecipe;
  }) => Promise<SharingResult>;
  copyCustomRecipeToClipboard: (params: {
    recipe: CustomRecipe;
  }) => Promise<SharingResult>;
  shareRegularRecipe: (params: {
    recipeId: string;
    recipeName: string;
    filmSlug?: string;
    developerSlug?: string;
  }) => Promise<SharingResult>;
  copyRegularRecipeToClipboard: (params: {
    recipeId: string;
    recipeName: string;
    filmSlug?: string;
    developerSlug?: string;
  }) => Promise<SharingResult>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export interface UseRecipeSharingActionsReturn {
  handleShareCombination: (
    view: DevelopmentCombinationView
  ) => Promise<undefined>;
  handleCopyCombination: (view: DevelopmentCombinationView) => Promise<void>;
}

/**
 * Hook for managing recipe sharing actions.
 * Extracts sharing and copying logic from the main useRecipeActions hook.
 */
export function useRecipeSharingActions({
  customRecipes,
  shareCustomRecipe,
  copyCustomRecipeToClipboard,
  shareRegularRecipe,
  copyRegularRecipeToClipboard,
  showToast,
}: UseRecipeSharingActionsProps): UseRecipeSharingActionsReturn {
  // Helper function to execute sharing action and show appropriate toast
  const executeRecipeShare = useCallback(
    async (
      view: DevelopmentCombinationView,
      shareMethod: 'share' | 'copy'
    ): Promise<SharingResult | undefined> => {
      try {
        const combinationId = String(
          view.combination.uuid || view.combination.id
        );

        let result: SharingResult | undefined;
        if (view.source === 'custom') {
          const recipe = customRecipes.find(
            (item) => item.id === combinationId
          );
          if (!recipe) {
            return undefined;
          }

          result =
            shareMethod === 'share'
              ? await shareCustomRecipe({ recipe })
              : await copyCustomRecipeToClipboard({ recipe });
        } else {
          // Share or copy regular recipe
          const recipeOptions = {
            recipeId: combinationId,
            recipeName: view.combination.name,
            filmSlug: view.film?.slug,
            developerSlug: view.developer?.slug,
          };

          result =
            shareMethod === 'share'
              ? await shareRegularRecipe(recipeOptions)
              : await copyRegularRecipeToClipboard(recipeOptions);
        }

        // Show toast if the result indicates we should
        if (result?.showToast) {
          if (result.success && result.method === 'clipboard') {
            showToast('Link copied to clipboard!', 'success');
          } else if (!result.success && result.error) {
            showToast(result.error, 'error');
          }
        }

        return result;
      } catch (error) {
        debugError('Failed to share/copy recipe:', error);
        showToast(
          'Something went wrong sharing this recipe. Please try again.',
          'error'
        );
        return undefined;
      }
    },
    [
      customRecipes,
      shareCustomRecipe,
      copyCustomRecipeToClipboard,
      shareRegularRecipe,
      copyRegularRecipeToClipboard,
      showToast,
    ]
  );

  const handleShareCombination = useCallback(
    async (view: DevelopmentCombinationView): Promise<undefined> => {
      await executeRecipeShare(view, 'share');
      // Return undefined to indicate toast is handled internally
      return undefined;
    },
    [executeRecipeShare]
  );

  const handleCopyCombination = useCallback(
    async (view: DevelopmentCombinationView): Promise<void> => {
      await executeRecipeShare(view, 'copy');
    },
    [executeRecipeShare]
  );

  return {
    handleShareCombination,
    handleCopyCombination,
  };
}
