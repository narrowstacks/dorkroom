import {
  buildRecipeShareUrl,
  type RecipeShareUrlOptions,
} from '../../utils/recipe-sharing';
import { shareLink } from '../../utils/share-link';
import {
  copyRecipeLink,
  type RecipeShareResult,
  toRecipeShareResult,
} from './recipe-share-result';
import { useCustomRecipeSharing } from './use-custom-recipe-sharing';

export type { RecipeShareResult } from './recipe-share-result';

export interface RegularRecipeShareOptions extends RecipeShareUrlOptions {
  /** Shown in the share sheet's title. */
  recipeName?: string;
}

const shareRegularRecipe = async (
  options: RegularRecipeShareOptions
): Promise<RecipeShareResult> => {
  const url = buildRecipeShareUrl(options);
  const outcome = await shareLink({
    url,
    title: `Development Recipe${
      options.recipeName ? `: ${options.recipeName}` : ''
    }`,
    legacyFallback: true,
  });
  return toRecipeShareResult(outcome, url, 'Failed to share recipe');
};

const copyRegularRecipeToClipboard = (
  options: RegularRecipeShareOptions
): Promise<RecipeShareResult> => copyRecipeLink(buildRecipeShareUrl(options));

/**
 * Shares development recipes, both database recipes and custom ones, through
 * the common share flow in `utils/share-link` (share sheet on mobile, then
 * clipboard).
 *
 * @example
 * ```typescript
 * const { shareRegularRecipe } = useRecipeSharing();
 * const result = await shareRegularRecipe({
 *   recipeId: 'recipe-123',
 *   filmSlug: 'kodak-tmax-400',
 *   developerSlug: 'kodak-d76',
 * });
 * ```
 */
export function useRecipeSharing() {
  const customRecipeSharing = useCustomRecipeSharing();

  return {
    generateRegularRecipeShareUrl: buildRecipeShareUrl,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,
    ...customRecipeSharing,
  };
}
