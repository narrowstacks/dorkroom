import { useCallback, useState } from 'react';
import { useCustomRecipeSharing } from './use-custom-recipe-sharing';
import { shouldUseWebShare } from '../../utils/device-detection';

interface RegularRecipeShareOptions {
  recipeId: string;
  recipeName?: string;
  filmSlug?: string;
  developerSlug?: string;
  baseUrl?: string;
  includeSource?: boolean;
}

interface RecipeShareResult {
  success: boolean;
  method?: 'webShare' | 'clipboard';
  url?: string;
  error?: string;
  showToast?: boolean;
}

const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.protocol}//${window.location.host}`;
};

const copyToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Hook for sharing development recipes via URLs, supporting both regular recipes
 * and custom recipes. Provides platform-appropriate sharing methods (Web Share API
 * on mobile, clipboard fallback on desktop).
 *
 * @returns Object containing recipe sharing functions for both regular and custom recipes
 *
 * @example
 * ```typescript
 * const {
 *   shareRegularRecipe,
 *   copyRegularRecipeToClipboard,
 *   shareCustomRecipe,
 *   getSharingMethodDescription
 * } = useRecipeSharing();
 *
 * // Share a regular recipe
 * const result = await shareRegularRecipe({
 *   recipeId: 'recipe-123',
 *   filmSlug: 'kodak-tmax-400',
 *   developerSlug: 'kodak-d76'
 * });
 *
 * // Get appropriate sharing method description
 * const method = await getSharingMethodDescription(); // "Share recipe" or "Copy link"
 * ```
 */
export function useRecipeSharing() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  const customRecipeSharing = useCustomRecipeSharing();

  const generateRegularRecipeShareUrl = useCallback(
    ({
      recipeId,
      filmSlug,
      developerSlug,
      baseUrl,
      includeSource = true,
    }: RegularRecipeShareOptions): string | null => {
      try {
        setIsGenerating(true);

        const base = baseUrl || getBaseUrl();
        const params = new URLSearchParams();

        // Add film and developer slugs if provided
        if (filmSlug) {
          params.set('film', filmSlug);
        }
        if (developerSlug) {
          params.set('developer', developerSlug);
        }

        params.set('recipe', recipeId);
        if (includeSource) {
          params.set('source', 'share');
        }

        const shareUrl = `${base}/development?${params.toString()}`;
        setLastSharedUrl(shareUrl);
        return shareUrl;
      } catch (error) {
        console.error('[RECIPE SHARE] Failed to generate share URL:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const shareRegularRecipe = useCallback(
    async (options: RegularRecipeShareOptions): Promise<RecipeShareResult> => {
      try {
        const shareUrl = generateRegularRecipeShareUrl(options);
        if (!shareUrl) {
          return { success: false, error: 'Failed to generate share URL' };
        }

        // Use Web Share API only on mobile devices
        if (shouldUseWebShare()) {
          try {
            await navigator.share({
              title: `Development Recipe${
                options.recipeName ? `: ${options.recipeName}` : ''
              }`,
              text: `Check out this film development recipe: ${shareUrl}`,
              url: shareUrl,
            });
            return { success: true, method: 'webShare', url: shareUrl };
          } catch (shareError) {
            console.log(
              '[RECIPE SHARE] Web Share failed, falling back:',
              shareError
            );
          }
        }

        await copyToClipboard(shareUrl);
        return {
          success: true,
          method: 'clipboard',
          url: shareUrl,
          showToast: true,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to share recipe';
        return { success: false, error: errorMessage };
      }
    },
    [generateRegularRecipeShareUrl]
  );

  const copyRegularRecipeToClipboard = useCallback(
    async (options: RegularRecipeShareOptions): Promise<RecipeShareResult> => {
      try {
        const shareUrl = generateRegularRecipeShareUrl(options);
        if (!shareUrl) {
          return { success: false, error: 'Failed to generate share URL' };
        }

        await copyToClipboard(shareUrl);
        return {
          success: true,
          method: 'clipboard',
          url: shareUrl,
          showToast: true,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to copy to clipboard';
        return { success: false, error: errorMessage };
      }
    },
    [generateRegularRecipeShareUrl]
  );

  const getSharingMethodDescription = useCallback(async (): Promise<string> => {
    if (shouldUseWebShare()) {
      return 'Share recipe';
    }

    return 'Copy link';
  }, []);

  const isSharingAvailable = useCallback(async (): Promise<boolean> => {
    // Sharing is always available - either via Web Share API or clipboard
    return true;
  }, []);

  return {
    // Regular recipe sharing
    generateRegularRecipeShareUrl,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,

    // Custom recipe sharing (delegated)
    generateCustomRecipeShareUrl:
      customRecipeSharing.generateCustomRecipeShareUrl,
    shareCustomRecipe: customRecipeSharing.shareCustomRecipe,
    copyCustomRecipeToClipboard:
      customRecipeSharing.copyCustomRecipeToClipboard,
    decodeSharedCustomRecipe: customRecipeSharing.decodeSharedCustomRecipe,
    isCustomRecipeUrl: customRecipeSharing.isCustomRecipeUrl,

    // Common utilities
    getSharingMethodDescription,
    isSharingAvailable,
    isGenerating: isGenerating || customRecipeSharing.isGenerating,
    lastSharedUrl: lastSharedUrl || customRecipeSharing.lastSharedUrl,
  };
}
