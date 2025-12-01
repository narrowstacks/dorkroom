import { useEffect, useState } from 'react';

export type ViewMode = 'table' | 'grid';

const STORAGE_KEY = 'dorkroom-development-recipes-view-mode';
const DEFAULT_VIEW_MODE: ViewMode = 'table';

const isBrowser = () => typeof window !== 'undefined';

export function useViewPreference() {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Failed to save view preference:', error);
    }
  };

  return {
    viewMode,
    setViewMode,
  };
}
