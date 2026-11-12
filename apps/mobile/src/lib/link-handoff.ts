import { isPhase } from '@/lib/tools';

/**
 * A link into a phase, split in two: the phase's hub, then the real target.
 * A warm link that goes straight to the target can pop screens off a tab that
 * is not on screen while it is being selected, and the native stack then shows
 * the wrong header (or the hub) over the right screen. Selecting the tab first
 * and pushing the target once it is showing avoids it.
 */
export interface PhaseLink {
  hub: string;
  target: string;
}

/**
 * Only a tab that is not on screen goes stale, so a link into the tab already
 * showing navigates directly (the user keeps their place; nothing pops first).
 */
let currentPath: string | null = null;

/** The tabs layout reports the route on screen here, for `handOffWarmLink`. */
export function setCurrentPath(path: string | null): void {
  currentPath = path;
}

/** The phase a path belongs to; Home, Search and anything else belong to none. */
export function phaseOfPath(path: string | null): string | undefined {
  if (path === null) return undefined;
  const [phase] = path.split(/[?#]/)[0].split('/').filter(Boolean);
  return phase !== undefined && isPhase(phase) ? phase : undefined;
}

/**
 * Decides how a warm link is opened. For a phase link whose tab is not the one
 * on screen (another phase, Home, or an unknown route) it records the target
 * for `useLinkHandoff` and returns the phase hub to open first. It returns
 * undefined when the link should be navigated directly: it is outside a phase,
 * or its phase is the tab on screen.
 */
export function handOffWarmLink(
  path: string,
  current: string | null = currentPath
): string | undefined {
  const split = splitPhaseLink(path);
  if (split === undefined) return undefined;
  if (phaseOfPath(current) === phaseOfPath(split.hub)) return undefined;
  setPendingLink(split);
  return split.hub;
}

export type HandoffStep = 'wait' | 'navigate' | 'clear';

/**
 * What `useLinkHandoff` does with a pending link on this render: open the
 * target once the hub shows, drop it when the user went somewhere else first
 * or it waited too long, and otherwise keep waiting.
 */
export function decideHandoff(input: {
  hub: string;
  armedPath: string;
  pathname: string;
  ageMs: number;
}): HandoffStep {
  if (input.ageMs > PENDING_LINK_TTL_MS) return 'clear';
  if (input.pathname === input.hub) return 'navigate';
  return input.pathname === input.armedPath ? 'wait' : 'clear';
}

/** How long a pending target may wait for its tab to show before it is dropped. */
export const PENDING_LINK_TTL_MS = 2000;

/**
 * Splits `/<phase>/<rest>` into the phase's hub and the full target. A hub
 * path, Home and anything outside a phase come back undefined: they need no
 * second step.
 */
export function splitPhaseLink(path: string): PhaseLink | undefined {
  const suffixIndex = path.search(/[?#]/);
  const pathOnly = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
  const [phase, ...rest] = pathOnly.split('/').filter(Boolean);
  if (phase === undefined || !isPhase(phase) || rest.length === 0) {
    return undefined;
  }
  return { hub: `/${phase}`, target: path };
}

interface Pending {
  link: PhaseLink;
  armedAt: number;
}

let pending: Pending | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Remembers the target to open once its hub is showing; the newest link wins. */
export function setPendingLink(link: PhaseLink, now = Date.now()): void {
  pending = { link, armedAt: now };
  emit();
}

export function getPendingLink(): PhaseLink | null {
  return pending?.link ?? null;
}

/** Hands the pending target over exactly once. */
export function takePendingLink(now = Date.now()): string | null {
  const taken = pending;
  pending = null;
  if (taken === null) return null;
  emit();
  return now - taken.armedAt > PENDING_LINK_TTL_MS ? null : taken.link.target;
}

export function clearPendingLink(): void {
  if (pending === null) return;
  pending = null;
  emit();
}

export function subscribePendingLink(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
