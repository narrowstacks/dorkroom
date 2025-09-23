import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import type { Combination } from '@/api/dorkroom/types';
import { debugLog, debugWarn, debugError } from '@/utils/debugLogger';

export interface ShareLinkOptions {
  recipe: Combination;
  baseUrl?: string;
  includeSource?: boolean;
}

export interface ShareResult {
  success: boolean;
  error?: string;
  method?: 'webShare' | 'expo' | 'clipboard';
}

/**
 * Hook for generating and sharing recipe URLs
 */
export const useShareLink = () => {
  /**
   * Generate a shareable URL for a recipe using its UUID
   */
  const generateShareUrl = useCallback((options: ShareLinkOptions): string => {
    const { recipe, baseUrl, includeSource = true } = options;

    // Get current base URL or construct it
    const base = baseUrl || getBaseUrl();

    // Build URL parameters
    const params = new URLSearchParams();

    // Use recipe UUID if available, otherwise fallback to recipe ID
    const recipeId = recipe.uuid || recipe.id;
    if (recipeId) {
      params.set('recipe', recipeId);
    }

    // Add source parameter to track shared links
    if (includeSource) {
      params.set('source', 'share');
    }

    return `${base}/developmentRecipes?${params.toString()}`;
  }, []);

  /**
   * Share a recipe using the most appropriate method for the platform
   */
  const shareRecipe = useCallback(
    async (options: ShareLinkOptions): Promise<ShareResult> => {
      try {
        const shareUrl = generateShareUrl(options);
        const { recipe } = options;

        // Create share content
        const title = `Development Recipe`;
        const message = `Check out this film development recipe: ${shareUrl}`;

        // Try Web Share API first (modern browsers and mobile)
        if (
          Platform.OS === 'web' &&
          typeof navigator !== 'undefined' &&
          navigator.share
        ) {
          try {
            await navigator.share({
              title,
              text: message,
              url: shareUrl,
            });
            return { success: true, method: 'webShare' };
          } catch (webShareError) {
            // User cancelled or Web Share API failed, fallback to clipboard
            debugLog(
              'Web Share API cancelled or failed, falling back to clipboard'
            );
          }
        }

        // Use Expo Sharing for native platforms
        if (Platform.OS !== 'web') {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(shareUrl, {
              mimeType: 'text/plain',
              dialogTitle: title,
            });
            return { success: true, method: 'expo' };
          }
        }

        // Fallback to clipboard
        await Clipboard.setStringAsync(shareUrl);
        return { success: true, method: 'clipboard' };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to share recipe';
        return { success: false, error: errorMessage };
      }
    },
    [generateShareUrl]
  );

  /**
   * Copy recipe URL to clipboard
   */
  const copyToClipboard = useCallback(
    async (options: ShareLinkOptions): Promise<ShareResult> => {
      try {
        const shareUrl = generateShareUrl(options);
        await Clipboard.setStringAsync(shareUrl);
        return { success: true, method: 'clipboard' };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to copy to clipboard';
        return { success: false, error: errorMessage };
      }
    },
    [generateShareUrl]
  );

  /**
   * Check if native sharing is available
   */
  const isSharingAvailable = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && !!navigator.share;
    }
    return await Sharing.isAvailableAsync();
  }, []);

  /**
   * Get the appropriate sharing method description for UI
   */
  const getSharingMethodDescription = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web') {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        return 'Share link';
      }
      return 'Copy link';
    }

    const isAvailable = await Sharing.isAvailableAsync();
    return isAvailable ? 'Share recipe' : 'Copy link';
  }, []);

  return {
    generateShareUrl,
    shareRecipe,
    copyToClipboard,
    isSharingAvailable,
    getSharingMethodDescription,
  };
};

/**
 * Get the base URL for the current environment
 */
function getBaseUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.host}`;
    }
    // Fallback for SSR or when window is not available
    return 'https://darkroom-recipes.app'; // Replace with your actual domain
  }

  // For native platforms, use a web fallback URL
  return 'https://darkroom-recipes.app'; // Replace with your actual domain
}
