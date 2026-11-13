// An incoming search (`dorkroom://search?q=...`) is an EVENT, not route params:
// the same query twice must fill the box twice, and the screen that ends up
// visible may be any of several Home instances (see "Legacy paths" in
// CLAUDE.md). `redirectSystemPath` records the event here and every mounted
// Home applies it when `seq` changes. A plain module-level store read with
// `useSyncExternalStore`, the same shape as `timer-store.ts`: no provider, no
// native imports.
import { normalizeLinkQuery } from '@/lib/home/query-link';

export interface SearchLinkSnapshot {
  /** The normalised query of the last event, `''` before any. */
  query: string;
  /** Counts events; 0 before the first. A change means a new event. */
  seq: number;
}

const NONE: SearchLinkSnapshot = { query: '', seq: 0 };

let snapshot = NONE;
// The newest event some Home has applied. A Home starts from it, so one that
// mounts later (a remount, a second instance) never replays an event that was
// already shown, while the first Home of a cold start (no event consumed yet)
// applies the pending one.
let consumedSeq = 0;
let initialSeen = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Records a search event. The query is normalised (trimmed, capped); one that
 * is empty afterwards is no event. Returns whether an event was recorded.
 */
export function pushSearchLink(query: string): boolean {
  const normalized = normalizeLinkQuery(query);
  if (normalized === '') return false;
  snapshot = { query: normalized, seq: snapshot.seq + 1 };
  // Notified after the current task, not inline: `redirectSystemPath` can run
  // while expo-router renders its container, and a Home updating then would
  // log "Cannot update a component while rendering a different component".
  // The snapshot is already current, so a Home that renders first reads it.
  queueMicrotask(notify);
  return true;
}

/**
 * Called for EVERY `redirectSystemPath({ initial: true })` call with the
 * search query its URL carries (`null` when it is not a search link). Only the
 * first call of the JS session counts, whatever its URL: it is the launch.
 * Later "initial" calls are ignored for search purposes, because expo-router
 * re-runs the hook on any re-render of its navigation container and expo-linking
 * overwrites the initial URL on each warm open, so such a call can carry the
 * latest opened URL and would replay it over what the user has typed since.
 * Returns whether an event was recorded.
 */
export function noteInitialUrl(query: string | null): boolean {
  if (initialSeen) return false;
  initialSeen = true;
  return query === null ? false : pushSearchLink(query);
}

export function getSearchLinkSnapshot(): SearchLinkSnapshot {
  return snapshot;
}

export function subscribeSearchLink(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The `seq` a Home that is mounting starts from: everything up to it was shown. */
export function getConsumedSearchSeq(): number {
  return consumedSeq;
}

/** A Home applied the event with this `seq`. Idempotent, and never goes back. */
export function consumeSearchLink(seq: number): void {
  consumedSeq = Math.max(consumedSeq, seq);
}

/** Test helper: forget every event. */
export function resetSearchLinks(): void {
  snapshot = NONE;
  consumedSeq = 0;
  initialSeen = false;
  notify();
}
