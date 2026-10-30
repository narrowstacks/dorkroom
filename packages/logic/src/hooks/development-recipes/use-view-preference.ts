import { useEffect, useState } from 'react';
import { RECIPES_VIEW_MODE_STORAGE_KEY } from '../../constants/storage-keys';
import { isBrowser } from '../../utils/environment';

export type ViewMode = 'table' | 'grid';

const DEFAULT_VIEW_MODE: ViewMode = 'table';

export function useViewPreference() {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const saved = localStorage.getItem(RECIPES_VIEW_MODE_STORAGE_KEY);
      if (saved === 'table' || saved === 'grid') {
        setViewModeState(saved);
      }
    } catch (error) {
      console.warn('Failed to load view preference:', error);
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);

    if (!isBrowser()) return;

    try {
      localStorage.setItem(RECIPES_VIEW_MODE_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save view preference:', error);
    }
  };

  return {
    viewMode,
    setViewMode,
  };
}
