import { useEffect, useState } from 'react';
import type {
  BorderPreset,
  BorderPresetSettings,
} from '../types/border-calculator';

const STORAGE_KEY = 'borderPresets';
const isBrowser = () => typeof window !== 'undefined';

/**
 * Hook for managing border calculator presets stored in localStorage.
 * Provides CRUD operations for saving and loading user-defined presets.
 *
 * @returns Object containing presets array and management functions
 *
 * @example
 * ```typescript
 * const {
 *   presets,
 *   addPreset,
 *   updatePreset,
 *   removePreset
 * } = useBorderPresets();
 *
 * // Add a new preset
 * addPreset({
 *   id: 'my-preset-1',
 *   name: 'Portrait Setup',
 *   settings: {
 *     aspectRatio: '3:2',
 *     paperSize: '8x10',
 *     minBorder: 0.5
 *   }
 * });
 *
 * // Update existing preset
 * updatePreset('my-preset-1', { name: 'Updated Portrait Setup' });
 * ```
 */
export function useBorderPresets() {
  const [presets, setPresets] = useState<BorderPreset[]>([]);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const next = JSON.parse(raw);
      if (Array.isArray(next)) {
        setPresets(next);
      }
    } catch (error) {
      console.warn('Failed to load presets', error);
    }
  }, []);

  const persist = (next: BorderPreset[]) => {
    setPresets(next);
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Failed to save presets', error);
    }
  };

  const addPreset = (preset: BorderPreset) => {
    persist([...presets, preset]);
  };

  const updatePreset = (id: string, updates: Partial<BorderPreset>) => {
    persist(
      presets.map((preset) =>
        preset.id === id ? { ...preset, ...updates } : preset
      )
    );
  };

  const removePreset = (id: string) => {
    persist(presets.filter((preset) => preset.id !== id));
  };

  return {
    presets,
    addPreset,
    updatePreset,
    removePreset,
  };
}

export type { BorderPreset, BorderPresetSettings };
