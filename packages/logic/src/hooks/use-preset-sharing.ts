import { useState, useCallback } from 'react';
import { encodePreset, type PresetToShare } from '../utils/preset-sharing';
import {
  generateSharingUrls,
  isWebShareSupported,
  isClipboardSupported,
  updateUrlWithPreset,
} from '../utils/url-helpers';

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

export function usePresetSharing(options: UsePresetSharingOptions = {}) {
  const [isSharing, setIsSharing] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  const { onShareSuccess, onShareError } = options;

  /**
   * Generate a shareable URL for the given preset
   */
  const generateShareUrl = useCallback((preset: PresetToShare): string | null => {
    const encoded = encodePreset(preset);
    if (!encoded) {
      return null;
    }

    const { webUrl } = generateSharingUrls(encoded);
    return webUrl;
  }, []);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (!isClipboardSupported()) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  /**
   * Share using the Web Share API
   */
  const shareNatively = useCallback(async (
    url: string,
    title: string = 'Border Calculator Preset'
  ): Promise<boolean> => {
    if (!isWebShareSupported()) {
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
      // User cancelled or share failed
      console.error('Native share failed:', error);
      return false;
    }
  }, []);

  /**
   * Main share function - tries different methods in order of preference
   */
  const sharePreset = useCallback(async (
    preset: PresetToShare,
    preferClipboard: boolean = false
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
          const result: ShareResult = { success: true, method: 'clipboard', url };
          onShareSuccess?.(result);
          return result;
        }
      }

      // Try native share if available and not preferring clipboard
      if (!preferClipboard && isWebShareSupported()) {
        const shareSuccess = await shareNatively(url, preset.name);
        if (shareSuccess) {
          const result: ShareResult = { success: true, method: 'native', url };
          onShareSuccess?.(result);
          return result;
        }
      }

      // Fallback to clipboard
      const clipboardSuccess = await copyToClipboard(url);
      if (clipboardSuccess) {
        const result: ShareResult = { success: true, method: 'clipboard', url };
        onShareSuccess?.(result);
        return result;
      }

      // Final fallback - manual copy (provide URL for user to copy manually)
      const result: ShareResult = { success: true, method: 'manual', url };
      onShareSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onShareError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSharing(false);
    }
  }, [generateShareUrl, copyToClipboard, shareNatively, onShareSuccess, onShareError]);

  /**
   * Update the current page URL with the preset (for bookmarking)
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
   * Get sharing URLs without actually sharing
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
    canShareNatively: isWebShareSupported(),
    canCopyToClipboard: isClipboardSupported(),
  };
}