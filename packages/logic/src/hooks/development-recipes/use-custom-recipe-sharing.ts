import { useCallback, useState } from 'react';
import type { CustomRecipe } from '../../types/custom-recipes';
import {
  encodeCustomRecipe,
  decodeCustomRecipe,
  createCustomRecipeFromEncoded,
  isValidCustomRecipeEncoding,
} from '../../utils/recipe-sharing';
import { debugLog } from '../../utils/debug-logger';

export interface CustomRecipeShareOptions {
  recipe: CustomRecipe;
  baseUrl?: string;
  includeSource?: boolean;
}

export interface CustomRecipeShareResult {
  success: boolean;
  error?: string;
  method?: 'webShare' | 'clipboard';
  url?: string;
}

export interface ImportedCustomRecipe {
  recipe: Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>;
  encodedData: string;
  isValid: boolean;
}

const copyToClipboard = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  if (typeof process !== 'undefined' && process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL;
  }

  return 'https://darkroom-recipes.app';
};

export const useCustomRecipeSharing = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  const generateCustomRecipeShareUrl = useCallback(
    ({
      recipe,
      baseUrl,
      includeSource = true,
    }: CustomRecipeShareOptions): string | null => {
      try {
        setIsGenerating(true);
        const encodedData = encodeCustomRecipe(recipe);
        if (!encodedData) {
          return null;
        }

        const base = baseUrl || getBaseUrl();
        const params = new URLSearchParams();
        params.set('recipe', encodedData);
        if (includeSource) {
          params.set('source', 'share');
        }

        const shareUrl = `${base}/development?${params.toString()}`;
        setLastSharedUrl(shareUrl);
        return shareUrl;
      } catch (error) {
        debugLog('[CUSTOM RECIPE SHARE] Failed to generate share URL:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const shareCustomRecipe = useCallback(
    async (
      options: CustomRecipeShareOptions
    ): Promise<CustomRecipeShareResult> => {
      try {
        const shareUrl = generateCustomRecipeShareUrl(options);
        if (!shareUrl) {
          return { success: false, error: 'Failed to generate share URL' };
        }

        if (
          typeof navigator !== 'undefined' &&
          typeof navigator.share === 'function'
        ) {
          try {
            await navigator.share({
              title: `Custom Development Recipe: ${options.recipe.name}`,
              text: `Check out this custom film development recipe: ${shareUrl}`,
              url: shareUrl,
            });
            return { success: true, method: 'webShare', url: shareUrl };
          } catch (shareError) {
            debugLog(
              '[CUSTOM RECIPE SHARE] Web Share failed, falling back:',
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
            : 'Failed to share custom recipe';
        return { success: false, error: errorMessage };
      }
    },
    [generateCustomRecipeShareUrl]
  );

  const copyCustomRecipeToClipboard = useCallback(
    async (
      options: CustomRecipeShareOptions
    ): Promise<CustomRecipeShareResult> => {
      try {
        const shareUrl = generateCustomRecipeShareUrl(options);
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
    [generateCustomRecipeShareUrl]
  );

  const decodeSharedCustomRecipe = useCallback(
    (encodedData: string): ImportedCustomRecipe | null => {
      if (!isValidCustomRecipeEncoding(encodedData)) {
        return null;
      }

      const decodedRecipe = decodeCustomRecipe(encodedData);
      if (!decodedRecipe) {
        return null;
      }

      const recipe = createCustomRecipeFromEncoded(decodedRecipe);
      return {
        recipe,
        encodedData,
        isValid: true,
      };
    },
    []
  );

  const isCustomRecipeUrl = useCallback((recipeParam: string): boolean => {
    if (
      recipeParam.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return false;
    }

    return recipeParam.length > 50 && isValidCustomRecipeEncoding(recipeParam);
  }, []);

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
    generateCustomRecipeShareUrl,
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    getSharingMethodDescription,
    isSharingAvailable,
    decodeSharedCustomRecipe,
    isCustomRecipeUrl,
    isGenerating,
    lastSharedUrl,
  };
};
