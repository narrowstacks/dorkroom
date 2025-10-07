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
    // Always use production API endpoint (local Vercel dev functions don't work)
    const baseUrl = 'https://dorkroom.art/api';

    const client = new DorkroomClient({ baseUrl });
    let cancelled = false;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Add 10-second timeout to prevent hanging
        const loadPromise = client.loadAll();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('API request timed out after 10 seconds')),
            10000
          )
        );

        await Promise.race([loadPromise, timeoutPromise]);

        if (!cancelled) {
          setFilms(client.getAllFilms());
          setDevelopers(client.getAllDevelopers());
          setCombinations(client.getAllCombinations());
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load data from API';
          setError(errorMessage);
          console.error('[InfobaseProvider] Error loading data:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
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
