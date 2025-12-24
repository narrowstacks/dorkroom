import type { VolumeUnit } from '@dorkroom/logic';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

interface VolumeContextValue {
  unit: VolumeUnit;
  setUnit: (unit: VolumeUnit) => void;
  toggleUnit: () => void;
}

const VolumeContext = createContext<VolumeContextValue | undefined>(undefined);

interface VolumeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'dorkroom-volume-unit';

export function VolumeProvider({ children }: VolumeProviderProps) {
  const [unit, setUnitState] = useState<VolumeUnit>('ml');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ml' || saved === 'floz') {
      setUnitState(saved);
    }
  }, []);

  const setUnit = (newUnit: VolumeUnit) => {
    setUnitState(newUnit);
    localStorage.setItem(STORAGE_KEY, newUnit);
  };

  const toggleUnit = () => {
    setUnit(unit === 'ml' ? 'floz' : 'ml');
  };

  return (
    <VolumeContext.Provider value={{ unit, setUnit, toggleUnit }}>
      {children}
    </VolumeContext.Provider>
  );
}

export function useVolume() {
  const context = useContext(VolumeContext);
  if (context === undefined) {
    throw new Error('useVolume must be used within a VolumeProvider');
  }
  return context;
}
