/** Quiet period before a result is written, so a drag records where it settles. */
export const RECORD_DELAY_MS = 500;

/**
 * The readout as one line for a hub tile. A separate unit sits right against
 * its value ("22.5s"), the way every other tool writes a time ("20s", "17m
 * 2.2s"), so the tile reads the same whichever tool it is. `null` (no result
 * yet) stays null.
 */
export function formatReadoutSummary(
  value: string | null,
  unit?: string
): string | null {
  if (value === null || value === '') return null;
  return `${value}${unit ?? ''}`;
}

export interface ResultRecorder<Id extends string> {
  /** Report what the screen shows now. */
  report(toolId: Id | undefined, text: string | null): void;
  /** Write a pending result straight away (the screen is going away). */
  flush(): void;
}

/**
 * Debounced, flush-on-leave writer behind `useRecordResult`.
 *
 * - Coalesces: only the value a drag settles on is written.
 * - Skips the value first rendered: nothing is written until the value has
 *   changed once. A tool that restores its inputs hydrates from storage after
 *   first render, which counts as a change and rewrites the same text.
 * - A result that is withdrawn (the inputs became invalid) is not written.
 * - `flush` writes what is pending, so leaving inside the quiet period loses
 *   nothing.
 */
export function createResultRecorder<Id extends string>(
  write: (toolId: Id, text: string) => void,
  delayMs: number = RECORD_DELAY_MS
): ResultRecorder<Id> {
  let started = false;
  let initial: string | null = null;
  let changed = false;
  let pending: { toolId: Id; text: string } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    const result = pending;
    pending = null;
    if (result) write(result.toolId, result.text);
  }

  return {
    report(toolId, text) {
      if (!started) {
        started = true;
        initial = text;
      } else if (text !== initial) {
        changed = true;
      }
      clearTimeout(timer);
      pending = null;
      if (!changed || toolId === undefined || text === null || text === '') {
        return;
      }
      pending = { toolId, text };
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
