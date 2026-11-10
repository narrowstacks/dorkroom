import { createContext, useContext } from 'react';
import type { Phase } from '@/lib/tools';

const PhaseContext = createContext<Phase | null>(null);

/**
 * Wraps a phase's stack so everything inside it (the backdrop glow, the hub)
 * knows which phase it is in without props. Outside a phase stack (Home,
 * Settings) there is none, which reads as neutral.
 */
export const PhaseProvider = PhaseContext.Provider;

export function usePhase(): Phase | null {
  return useContext(PhaseContext);
}
