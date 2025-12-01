import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { TemperatureUnit } from '../lib/temperature';

interface TemperatureContextValue {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  toggleUnit: () => void;
}

const TemperatureContext = createContext<TemperatureContextValue | undefined>(
  undefined
);

interface TemperatureProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'dorkroom-temperature-unit';

export function TemperatureProvider({ children }: TemperatureProviderProps) {
  const [unit, setUnitState] = useState<TemperatureUnit>('fahrenheit');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'celsius' || saved === 'fahrenheit') {
      setUnitState(saved);
    }
  }, []);

  const setUnit = (newUnit: TemperatureUnit) => {
    setUnitState(newUnit);
    localStorage.setItem(STORAGE_KEY, newUnit);
  };

  const toggleUnit = () => {
    setUnit(unit === 'fahrenheit' ? 'celsius' : 'fahrenheit');
  };

  return (
    <TemperatureContext.Provider value={{ unit, setUnit, toggleUnit }}>
      {children}
    </TemperatureContext.Provider>
  );
}

export function useTemperature() {
  const context = useContext(TemperatureContext);
  if (context === undefined) {
    throw new Error('useTemperature must be used within a TemperatureProvider');
  }
  return context;
}
