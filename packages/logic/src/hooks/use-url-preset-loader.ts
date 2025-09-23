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
   * Load a preset from an encoded string
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
   * Check URL for preset and load it
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
   * Manually load a preset from encoded string
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
   * Clear the currently loaded preset
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
