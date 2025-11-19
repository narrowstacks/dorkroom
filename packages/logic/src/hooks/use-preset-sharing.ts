import { useState, useCallback } from 'react';
import { encodePreset, type PresetToShare } from '../utils/preset-sharing';
import {
  generateSharingUrls,
  isClipboardSupported,
  updateUrlWithPreset,
} from '../utils/url-helpers';
import { shouldUseWebShare } from '../utils/device-detection';
import { debugError } from '../utils/debug-logger';

export interface ShareResult {
  success: boolean;
  method?: 'native' | 'clipboard' | 'manual';
  url?: string;
  error?: string;
}

export interface UsePresetSharingOptions {
  onShareSuccess?: (result: ShareResult) => void;
  onShareError?: (error: string) => void;
}

/**
 * Hook that generates shareable URLs for border presets and triggers sharing flows.
 * Tries native sharing first, falls back to clipboard/manual methods, and reports results.
 *
 * @param options - Optional callbacks invoked on successful share or error
 * @returns Sharing helpers, current state, and utilities for preset URLs
 */
export function usePresetSharing(options: UsePresetSharingOptions = {}) {
  const [isSharing, setIsSharing] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  const { onShareSuccess, onShareError } = options;

  /**
   * Generate a shareable URL for the given preset.
   *
   * @param preset - Preset values to encode into the URL
   * @returns Shareable web URL string or null when encoding fails
   */
  const generateShareUrl = useCallback(
    (preset: PresetToShare): string | null => {
      const encoded = encodePreset(preset);
      if (!encoded) {
        return null;
      }

      const { webUrl } = generateSharingUrls(encoded);
      return webUrl;
    },
    []
  );

  /**
   * Copy text to the clipboard.
   *
   * @param text - String to write to the clipboard
   * @returns Promise resolving to true when the copy succeeded
   */
  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!isClipboardSupported()) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        debugError('Failed to copy to clipboard:', error);
        return false;
      }
    },
    []
  );

  /**
   * Share using the Web Share API.
   *
   * @param url - Fully formed preset URL to share
   * @param title - Title passed to the native share sheet
   * @returns Promise resolving to true when sharing completes successfully
   */
  const shareNatively = useCallback(
    async (
      url: string,
      title = 'Border Calculator Preset'
    ): Promise<boolean | 'cancelled'> => {
      if (!shouldUseWebShare()) {
        return false;
      }

      try {
        await navigator.share({
          title,
          text: `Check out this border calculator preset: ${title}`,
          url,
        });
        return true;
      } catch (error) {
        // Check if user cancelled the share (AbortError)
        if (error instanceof Error && error.name === 'AbortError') {
          // User cancelled - return special value to prevent fallback
          return 'cancelled';
        }
        // Other errors - log and return false to trigger fallback
        debugError('Native share failed:', error);
        return false;
      }
    },
    []
  );

  /**
   * Main share function - tries different methods in order of preference.
   *
   * @param preset - Preset configuration to share
   * @param preferClipboard - Whether clipboard copy should be attempted before native share
   * @returns ShareResult describing the attempted sharing method and outcome
   */
  const sharePreset = useCallback(
    async (
      preset: PresetToShare,
      preferClipboard = false
    ): Promise<ShareResult> => {
      setIsSharing(true);

      try {
        const url = generateShareUrl(preset);
        if (!url) {
          const error = 'Failed to generate share URL';
          onShareError?.(error);
          return { success: false, error };
        }

        setLastSharedUrl(url);

        // Try preferred method first
        if (preferClipboard) {
          const clipboardSuccess = await copyToClipboard(url);
          if (clipboardSuccess) {
            const result: ShareResult = {
              success: true,
              method: 'clipboard',
              url,
            };
            onShareSuccess?.(result);
            return result;
          }
        }

        // Try native share if available and not preferring clipboard
        if (!preferClipboard && shouldUseWebShare()) {
          const shareSuccess = await shareNatively(url, preset.name);
          if (shareSuccess === true) {
            const result: ShareResult = {
              success: true,
              method: 'native',
              url,
            };
            onShareSuccess?.(result);
            return result;
          }
          if (shareSuccess === 'cancelled') {
            // User cancelled - return success without showing error
            return { success: true, method: 'native', url };
          }
        }

        // Fallback to clipboard
        const clipboardSuccess = await copyToClipboard(url);
        if (clipboardSuccess) {
          const result: ShareResult = {
            success: true,
            method: 'clipboard',
            url,
          };
          onShareSuccess?.(result);
          return result;
        }

        // Final fallback - manual copy (provide URL for user to copy manually)
        const result: ShareResult = { success: true, method: 'manual', url };
        onShareSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        onShareError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsSharing(false);
      }
    },
    [
      generateShareUrl,
      copyToClipboard,
      shareNatively,
      onShareSuccess,
      onShareError,
    ]
  );

  /**
   * Update the current page URL with the preset (for bookmarking).
   *
   * @param preset - Preset data to encode into the URL
   * @returns True when the preset was encoded and applied to the URL
   */
  const updateCurrentUrl = useCallback((preset: PresetToShare): boolean => {
    const encoded = encodePreset(preset);
    if (!encoded) {
      return false;
    }

    updateUrlWithPreset(encoded);
    return true;
  }, []);

  /**
   * Get sharing URLs without performing a share action.
   *
   * @param preset - Preset data to encode
   * @returns Object containing URL variants or null when encoding fails
   */
  const getSharingUrls = useCallback((preset: PresetToShare) => {
    const encoded = encodePreset(preset);
    if (!encoded) {
      return null;
    }

    return generateSharingUrls(encoded);
  }, []);

  return {
    // State
    isSharing,
    lastSharedUrl,

    // Actions
    sharePreset,
    generateShareUrl,
    copyToClipboard,
    updateCurrentUrl,
    getSharingUrls,

    // Capabilities
    canShareNatively: shouldUseWebShare(),
    canCopyToClipboard: isClipboardSupported(),
  };
}
