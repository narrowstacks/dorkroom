import { useCallback, useState } from 'react';
import { useCustomRecipeSharing } from './use-custom-recipe-sharing';

interface RegularRecipeShareOptions {
  recipeId: string;
  recipeName?: string;
  baseUrl?: string;
  includeSource?: boolean;
}

interface RecipeShareResult {
  success: boolean;
  method?: 'webShare' | 'clipboard';
  url?: string;
  error?: string;
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

export function useRecipeSharing() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  const customRecipeSharing = useCustomRecipeSharing();

  const generateRegularRecipeShareUrl = useCallback(
    ({
      recipeId,
      baseUrl,
      includeSource = true,
    }: RegularRecipeShareOptions): string | null => {
      try {
        setIsGenerating(true);

        const base = baseUrl || getBaseUrl();
        const params = new URLSearchParams();
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
    async (
      options: RegularRecipeShareOptions
    ): Promise<RecipeShareResult> => {
      try {
        const shareUrl = generateRegularRecipeShareUrl(options);
        if (!shareUrl) {
          return { success: false, error: 'Failed to generate share URL' };
        }

        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          try {
            await navigator.share({
              title: `Development Recipe${options.recipeName ? `: ${options.recipeName}` : ''}`,
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
        return { success: true, method: 'clipboard', url: shareUrl };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to share recipe';
        return { success: false, error: errorMessage };
      }
    },
    [generateRegularRecipeShareUrl]
  );

  const copyRegularRecipeToClipboard = useCallback(
    async (
      options: RegularRecipeShareOptions
    ): Promise<RecipeShareResult> => {
      try {
        const shareUrl = generateRegularRecipeShareUrl(options);
        if (!shareUrl) {
          return { success: false, error: 'Failed to generate share URL' };
        }

        await copyToClipboard(shareUrl);
        return { success: true, method: 'clipboard', url: shareUrl };
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
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      return 'Share recipe';
    }

    return 'Copy link';
  }, []);

  const isSharingAvailable = useCallback(async (): Promise<boolean> => {
    return (
      typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    );
  }, []);

  return {
    // Regular recipe sharing
    generateRegularRecipeShareUrl,
    shareRegularRecipe,
    copyRegularRecipeToClipboard,

    // Custom recipe sharing (delegated)
    generateCustomRecipeShareUrl: customRecipeSharing.generateCustomRecipeShareUrl,
    shareCustomRecipe: customRecipeSharing.shareCustomRecipe,
    copyCustomRecipeToClipboard: customRecipeSharing.copyCustomRecipeToClipboard,
    decodeSharedCustomRecipe: customRecipeSharing.decodeSharedCustomRecipe,
    isCustomRecipeUrl: customRecipeSharing.isCustomRecipeUrl,

    // Common utilities
    getSharingMethodDescription,
    isSharingAvailable,
    isGenerating: isGenerating || customRecipeSharing.isGenerating,
    lastSharedUrl: lastSharedUrl || customRecipeSharing.lastSharedUrl,
  };
}