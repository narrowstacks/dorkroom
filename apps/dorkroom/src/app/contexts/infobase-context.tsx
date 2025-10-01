/**
 * Infobase Data Context
 * Provides API data (films, developers, combinations) to MDX components
 */

import type { ReactNode, ReactElement } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { DorkroomClient, Film, Developer, Combination } from '@dorkroom/api';

interface InfobaseContextValue {
  films: Film[];
  developers: Developer[];
  combinations: Combination[];
  isLoading: boolean;
  error: string | null;
}

const InfobaseContext = createContext<InfobaseContextValue | undefined>(
  undefined
);

export function useInfobaseData() {
  const context = useContext(InfobaseContext);
  if (!context) {
    throw new Error('useInfobaseData must be used within InfobaseProvider');
  }
  return context;
}

interface InfobaseProviderProps {
  children: ReactNode;
}

export function InfobaseProvider({
  children,
}: InfobaseProviderProps): ReactElement {
  const [films, setFilms] = useState<Film[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = new DorkroomClient();

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        await client.loadAll();

        setFilms(client.getAllFilms());
        setDevelopers(client.getAllDevelopers());
        setCombinations(client.getAllCombinations());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load data from API'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <InfobaseContext.Provider
      value={{
        films,
        developers,
        combinations,
        isLoading,
        error,
      }}
    >
      {children}
    </InfobaseContext.Provider>
  );
}
