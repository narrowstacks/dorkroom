import type { Phase } from '@/lib/tools';

/**
 * Whether a phase's headers carry the safelight switch: always in Print, and in
 * every phase while the mode is on, so it can be turned off wherever you are.
 * Home has no header and no phase, so it never offers one.
 */
export function offersSafelightButton(
  phase: Phase | null,
  safelightOn: boolean
): boolean {
  if (phase === null) return false;
  return phase === 'print' || safelightOn;
}
