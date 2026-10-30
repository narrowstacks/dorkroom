import {
  copyTextToClipboard,
  type ShareLinkOutcome,
} from '../../utils/share-link';

/** What a recipe share or copy action reports back to the page. */
export interface RecipeShareResult {
  success: boolean;
  method?: 'webShare' | 'clipboard';
  url?: string;
  error?: string;
  /** False only when the user cancelled the share sheet. */
  showToast?: boolean;
}

export const urlFailure: RecipeShareResult = {
  success: false,
  error: 'Failed to generate share URL',
  showToast: true,
};

/** Maps a {@link ShareLinkOutcome} to the result the recipes page expects. */
export function toRecipeShareResult(
  outcome: ShareLinkOutcome,
  url: string,
  fallbackError: string
): RecipeShareResult {
  switch (outcome.status) {
    case 'shared':
      return outcome.method === 'native'
        ? { success: true, method: 'webShare', url }
        : { success: true, method: 'clipboard', url, showToast: true };
    case 'cancelled':
      return { success: false, showToast: false };
    case 'manual':
      return {
        success: false,
        error: outcome.errorMessage ?? fallbackError,
        showToast: true,
      };
  }
}

/** Copies a recipe link without offering the share sheet. */
export async function copyRecipeLink(
  url: string | null
): Promise<RecipeShareResult> {
  if (!url) {
    return urlFailure;
  }
  const fallbackError = 'Failed to copy to clipboard';
  try {
    const copied = await copyTextToClipboard(url, { legacyFallback: true });
    return copied
      ? { success: true, method: 'clipboard', url, showToast: true }
      : { success: false, error: fallbackError, showToast: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackError,
      showToast: true,
    };
  }
}
