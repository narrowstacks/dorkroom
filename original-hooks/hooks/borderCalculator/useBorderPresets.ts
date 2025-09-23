import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BorderPreset,
  BorderPresetSettings,
} from '@/types/borderPresetTypes';

const STORAGE_KEY = 'borderPresets';

export const useBorderPresets = () => {
  const [presets, setPresets] = useState<BorderPreset[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const arr = JSON.parse(json);
          if (Array.isArray(arr)) {
            setPresets(arr);
          }
        }
      } catch (e) {
        console.warn('Failed to load presets', e);
      }
    })();
  }, []);

  const persist = async (next: BorderPreset[]) => {
    setPresets(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save presets', e);
    }
  };

  const addPreset = async (preset: BorderPreset) => {
    await persist([...presets, preset]);
  };

  const updatePreset = async (id: string, preset: Partial<BorderPreset>) => {
    await persist(presets.map((p) => (p.id === id ? { ...p, ...preset } : p)));
  };

  const removePreset = async (id: string) => {
    await persist(presets.filter((p) => p.id !== id));
  };

  return { presets, addPreset, updatePreset, removePreset };
};

export type { BorderPreset, BorderPresetSettings };
export default useBorderPresets;
