import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { MeasurementUnit } from '@dorkroom/logic';

interface MeasurementContextValue {
  unit: MeasurementUnit;
  setUnit: (unit: MeasurementUnit) => void;
  toggleUnit: () => void;
}

const MeasurementContext = createContext<MeasurementContextValue | undefined>(
  undefined
);

interface MeasurementProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'dorkroom-measurement-unit';

export function MeasurementProvider({ children }: MeasurementProviderProps) {
  const [unit, setUnitState] = useState<MeasurementUnit>('imperial');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'imperial' || saved === 'metric') {
      setUnitState(saved);
    }
  }, []);

  const setUnit = (newUnit: MeasurementUnit) => {
    setUnitState(newUnit);
    localStorage.setItem(STORAGE_KEY, newUnit);
  };

  const toggleUnit = () => {
    setUnit(unit === 'imperial' ? 'metric' : 'imperial');
  };

  return (
    <MeasurementContext.Provider value={{ unit, setUnit, toggleUnit }}>
      {children}
    </MeasurementContext.Provider>
  );
}

export function useMeasurement() {
  const context = useContext(MeasurementContext);
  if (context === undefined) {
    throw new Error('useMeasurement must be used within a MeasurementProvider');
  }
  return context;
}
