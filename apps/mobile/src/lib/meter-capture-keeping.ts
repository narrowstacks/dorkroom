// Which meter capture is current, and which photo files must go. Pure: the hook
// applies the result (state, and deleting the files it names).

export interface CaptureKey {
  rollId: string;
  fileName: string;
}

export interface Kept<T extends CaptureKey> {
  /** The capture that is current afterwards. */
  current: T | null;
  /** Photo files to delete. */
  discard: string[];
}

/**
 * A capture finished saving. It becomes current only if it is for the roll the
 * meter is on now; a capture for another roll is deleted, never shown. A
 * capture it replaces is deleted too, so its file is not left behind.
 */
export function landCapture<T extends CaptureKey>(
  current: T | null,
  incoming: T,
  activeRollId: string | undefined
): Kept<T> {
  if (incoming.rollId !== activeRollId) {
    return { current, discard: [incoming.fileName] };
  }
  return {
    current: incoming,
    discard:
      current && current.fileName !== incoming.fileName
        ? [current.fileName]
        : [],
  };
}

/** The meter's roll changed: a capture for any other roll is deleted. */
export function rollChanged<T extends CaptureKey>(
  current: T | null,
  activeRollId: string | undefined
): Kept<T> {
  if (current && current.rollId !== activeRollId) {
    return { current: null, discard: [current.fileName] };
  }
  return { current, discard: [] };
}

export interface Taken<T extends CaptureKey> {
  /** The capture handed back, or null when `fileName` named nothing current. */
  taken: T | null;
  current: T | null;
}

/** Takes the current capture only if `fileName` still names it. */
export function takeCapture<T extends CaptureKey>(
  current: T | null,
  fileName: string
): Taken<T> {
  if (!current || current.fileName !== fileName) {
    return { taken: null, current };
  }
  return { taken: current, current: null };
}
