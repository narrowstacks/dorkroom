import type { CustomRecipe } from '../../types/custom-recipes';
import {
  buildCustomRecipeShareUrl,
  createCustomRecipeFromEncoded,
  type CustomRecipeShareUrlOptions,
  decodeCustomRecipe,
  isValidCustomRecipeEncoding,
} from '../../utils/recipe-sharing';
import { shareLink } from '../../utils/share-link';
import {
  copyRecipeLink,
  type RecipeShareResult,
  toRecipeShareResult,
  urlFailure,
} from './recipe-share-result';

export type CustomRecipeShareOptions = CustomRecipeShareUrlOptions;
export type CustomRecipeShareResult = RecipeShareResult;

export interface ImportedCustomRecipe {
  recipe: Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>;
  encodedData: string;
  isValid: boolean;
}

const shareCustomRecipe = async (
  options: CustomRecipeShareOptions
): Promise<CustomRecipeShareResult> => {
  const url = buildCustomRecipeShareUrl(options);
  if (!url) {
    return urlFailure;
  }
  const outcome = await shareLink({
    url,
    title: `Custom Development Recipe: ${options.recipe.name}`,
    legacyFallback: true,
    copyOnCancel: true,
  });
  return toRecipeShareResult(outcome, url, 'Failed to share custom recipe');
};

const copyCustomRecipeToClipboard = (
  options: CustomRecipeShareOptions
): Promise<CustomRecipeShareResult> =>
  copyRecipeLink(buildCustomRecipeShareUrl(options));

const decodeSharedCustomRecipe = (
  encodedData: string
): ImportedCustomRecipe | null => {
  if (!isValidCustomRecipeEncoding(encodedData)) {
    return null;
  }

  const decodedRecipe = decodeCustomRecipe(encodedData);
  if (!decodedRecipe) {
    return null;
  }

  return {
    recipe: createCustomRecipeFromEncoded(decodedRecipe),
    encodedData,
    isValid: true,
  };
};

const isCustomRecipeUrl = (recipeParam: string): boolean => {
  if (
    recipeParam.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  ) {
    return false;
  }

  // Shape only, not validity: a link that looks like an encoded recipe but
  // fails to decode (bad JSON, out-of-range values) must still take the
  // custom-recipe path so the user sees "Invalid custom recipe data"
  // instead of waiting on a database lookup that can never match.
  return recipeParam.length > 50 && /^[A-Za-z0-9_-]+$/.test(recipeParam);
};

const customRecipeSharing = {
  generateCustomRecipeShareUrl: buildCustomRecipeShareUrl,
  shareCustomRecipe,
  copyCustomRecipeToClipboard,
  decodeSharedCustomRecipe,
  isCustomRecipeUrl,
};

/**
 * Builds, shares and decodes custom-recipe links. The share flow itself
 * (share sheet, clipboard, fallback) lives in `utils/share-link`.
 *
 * @returns Stable helpers; none of them hold state
 */
export const useCustomRecipeSharing = () => customRecipeSharing;
