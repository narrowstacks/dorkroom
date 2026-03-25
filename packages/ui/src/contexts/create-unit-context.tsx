import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface UnitContextValue<T extends string> {
  unit: T;
  setUnit: (unit: T) => void;
  toggleUnit: () => void;
}

interface UnitContextConfig<T extends string> {
  name: string;
  storageKey: string;
  defaultUnit: T;
  units: readonly [T, T];
}

interface UnitContextResult<T extends string> {
  Provider: React.FC<{ children: ReactNode }>;
  useUnit: () => UnitContextValue<T>;
}

export function createUnitContext<T extends string>(
  config: UnitContextConfig<T>
): UnitContextResult<T> {
  const Context = createContext<UnitContextValue<T> | undefined>(undefined);

  const { storageKey, defaultUnit, units } = config;
  const [unitA, unitB] = units;

  function Provider({ children }: { children: ReactNode }) {
    const [unit, setUnitState] = useState<T>(defaultUnit);

    useEffect(() => {
      const saved = localStorage.getItem(storageKey);
      if (saved === unitA || saved === unitB) {
        setUnitState(saved as T);
      }
    }, []);

    function setUnit(newUnit: T): void {
      setUnitState(newUnit);
      localStorage.setItem(storageKey, newUnit);
    }

    function toggleUnit(): void {
      setUnit(unit === unitA ? unitB : unitA);
    }

    return (
      <Context.Provider value={{ unit, setUnit, toggleUnit }}>
        {children}
      </Context.Provider>
    );
  }

  function useUnit(): UnitContextValue<T> {
    const context = useContext(Context);
    if (context === undefined) {
      throw new Error(
        `use${config.name} must be used within a ${config.name}Provider`
      );
    }
    return context;
  }

  return { Provider, useUnit };
}
