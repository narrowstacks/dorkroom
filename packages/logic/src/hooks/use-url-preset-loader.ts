import { useState, useEffect, useCallback } from 'react';
import type { BorderPresetSettings } from '../types/border-calculator';
import { decodePreset, isValidEncodedPreset } from '../utils/preset-sharing';
import { getPresetFromUrl, clearPresetFromUrl } from '../utils/url-helpers';

export interface LoadedPreset {
  name: string;
  settings: BorderPresetSettings;
  isFromUrl: boolean;
}

export interface UseUrlPresetLoaderOptions {
  onPresetLoaded?: (preset: LoadedPreset) => void;
  onLoadError?: (error: string) => void;
  autoApply?: boolean;
  clearUrlAfterLoad?: boolean;
}

/**
 * Manage loading and decoding of border presets from URL hashes or encoded strings.
 *
 * Loads a preset found in the URL (optionally automatically on mount and on hashchange), provides a manual loader for encoded preset strings, and exposes loading state, any load error, and helpers to apply or clear presets.
 *
 * @param options - Configuration for preset loading behavior.
 *   - onPresetLoaded: called with the LoadedPreset after a successful load.
 *   - onLoadError: called with an error message when loading fails.
 *   - autoApply: when true (default), the hook attempts to load a preset from the URL on mount and on hash changes.
 *   - clearUrlAfterLoad: when true (default), removes the preset from the URL after successfully loading it.
 * @returns An object containing:
 *   - loadedPreset: the currently loaded preset or `null`.
 *   - isLoading: `true` while a load is in progress.
 *   - loadError: an error message when a load fails, or `null`.
 *   - checkAndLoadFromUrl: checks the current URL for an encoded preset and loads it.
 *   - loadPreset: manually load a preset from an encoded string.
 *   - clearLoadedPreset: clears the currently loaded preset and any load error.
 *   - loadPresetFromEncoded: utility that validates and decodes an encoded preset string, returning `LoadedPreset` or `null`.
 */
export function useUrlPresetLoader(options: UseUrlPresetLoaderOptions = {}) {
  const [loadedPreset, setLoadedPreset] = useState<LoadedPreset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    onPresetLoaded,
    onLoadError,
    autoApply = true,
    clearUrlAfterLoad = true,
  } = options;

  /**
   * Load a preset from an encoded string.
   *
   * @param encoded - Base64 encoded preset payload
   * @returns Loaded preset metadata when decoding succeeds, otherwise null
   */
  const loadPresetFromEncoded = useCallback(
    (encoded: string): LoadedPreset | null => {
      if (!isValidEncodedPreset(encoded)) {
        return null;
      }

      const decoded = decodePreset(encoded);
      if (!decoded) {
        return null;
      }

      return {
        name: decoded.name,
        settings: decoded.settings,
        isFromUrl: true,
      };
    },
    []
  );

  /**
   * Check the current URL for an encoded preset and load it.
   *
   * @returns Loaded preset data or null when nothing valid is found
   */
  const checkAndLoadFromUrl = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const encoded = getPresetFromUrl();
      if (!encoded) {
        setLoadedPreset(null);
        setIsLoading(false);
        return null;
      }

      const preset = loadPresetFromEncoded(encoded);
      if (!preset) {
        const error = 'Invalid preset URL';
        setLoadError(error);
        onLoadError?.(error);
        setIsLoading(false);
        return null;
      }

      setLoadedPreset(preset);
      onPresetLoaded?.(preset);

      // Clear URL if requested
      if (clearUrlAfterLoad) {
        clearPresetFromUrl();
      }

      setIsLoading(false);
      return preset;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load preset from URL';
      setLoadError(errorMessage);
      onLoadError?.(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, [loadPresetFromEncoded, onPresetLoaded, onLoadError, clearUrlAfterLoad]);

  /**
   * Manually load a preset from an encoded string.
   *
   * @param encoded - Base64 encoded preset payload to decode
   * @returns Loaded preset data or null when decoding fails
   */
  const loadPreset = useCallback(
    (encoded: string): LoadedPreset | null => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const preset = loadPresetFromEncoded(encoded);
        if (!preset) {
          const error = 'Invalid encoded preset';
          setLoadError(error);
          onLoadError?.(error);
          setIsLoading(false);
          return null;
        }

        // Mark as not from URL since it was manually loaded
        const manualPreset: LoadedPreset = {
          ...preset,
          isFromUrl: false,
        };

        setLoadedPreset(manualPreset);
        onPresetLoaded?.(manualPreset);
        setIsLoading(false);
        return manualPreset;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load preset';
        setLoadError(errorMessage);
        onLoadError?.(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    [loadPresetFromEncoded, onPresetLoaded, onLoadError]
  );

  /**
   * Clear the currently loaded preset.
   *
   * @returns void
   */
  const clearLoadedPreset = useCallback(() => {
    setLoadedPreset(null);
    setLoadError(null);
  }, []);

  /**
   * Check if there's a preset in the URL on mount
   */
  useEffect(() => {
    if (autoApply) {
      checkAndLoadFromUrl();
    }
  }, [autoApply, checkAndLoadFromUrl]);

  /**
   * Listen for hash changes (in case preset URLs are shared while app is running)
   */
  useEffect(() => {
    if (!autoApply) {
      return;
    }

    const handleHashChange = () => {
      checkAndLoadFromUrl();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [autoApply, checkAndLoadFromUrl]);

  return {
    // State
    loadedPreset,
    isLoading,
    loadError,

    // Actions
    checkAndLoadFromUrl,
    loadPreset,
    clearLoadedPreset,

    // Utilities
    loadPresetFromEncoded,
  };
}
