/**
 * Infobase Data Context
 * Provides a shared DorkroomClient instance for on-demand data fetching
 */

import type { ReactNode, ReactElement } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { DorkroomClient } from '@dorkroom/api';

interface InfobaseContextValue {
  client: DorkroomClient;
}

const InfobaseContext = createContext<InfobaseContextValue | undefined>(
  undefined
);

export function useInfobaseClient() {
  const context = useContext(InfobaseContext);
  if (!context) {
    throw new Error('useInfobaseClient must be used within InfobaseProvider');
  }
  return context.client;
}

interface InfobaseProviderProps {
  children: ReactNode;
}

export function InfobaseProvider({
  children,
}: InfobaseProviderProps): ReactElement {
  // Create a single shared client instance
  // Always use production API endpoint (local Vercel dev functions don't work)
  const client = useMemo(
    () => new DorkroomClient({ baseUrl: 'https://dorkroom.art/api' }),
    []
  );

  return (
    <InfobaseContext.Provider value={{ client }}>
      {children}
    </InfobaseContext.Provider>
  );
}
