// Decides whether an Export tap is ignored. Pure, so the clock edge cases are
// tested outside the app.
export const TAP_WINDOW_MS = 1000;

interface TapState {
  /** An export is being prepared. */
  exporting: boolean;
  now: number;
  /** When `Share.share` was last called (0 if never). */
  lastShareCall: number;
}

/** Ignore a tap while an export is being prepared, or within the window after
 * the share call. A negative elapsed time (the clock was set back) is not
 * "recent": it must never lock Export until the clock catches up. */
export function shouldIgnoreExportTap({
  exporting,
  now,
  lastShareCall,
}: TapState): boolean {
  const elapsed = now - lastShareCall;
  return exporting || (elapsed >= 0 && elapsed < TAP_WINDOW_MS);
}
