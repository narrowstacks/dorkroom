import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  acquireLatch,
  dragOwnsClose,
  type LatchOwner,
  type LatchState,
  OPEN_LATCH,
  releaseCommit,
} from './sheet-latch';

interface SheetLatchInput {
  onClose: () => void;
  /** Return false for a refusal: nothing was committed and the sheet stays open. */
  onCommit: () => boolean | undefined;
  /** Mirrors the latch on the UI thread, so a pan cannot start once it is set. */
  closingSV: SharedValue<boolean>;
  /** Where the sheet publishes its guarded close, for the hardware close. */
  registerClose: { current: (() => void) | null };
}

/**
 * Makes one opening single-use (see `sheet-latch.ts`): the first accepted
 * cancel, commit or dismiss drag owns the ending and every later close or
 * commit is ignored. The dismiss drag's slide-out delivers the close only
 * while the drag still owns it, so no close follows an accepted commit.
 */
export function useSheetLatch({
  onClose,
  onCommit,
  closingSV,
  registerClose,
}: SheetLatchInput) {
  const [closing, setClosing] = useState(false);
  const state = useRef<LatchState>(OPEN_LATCH);
  const closeProp = useRef(onClose);
  const commitProp = useRef(onCommit);
  useLayoutEffect(() => {
    closeProp.current = onClose;
    commitProp.current = onCommit;
  });

  const acquire = useCallback(
    (owner: Exclude<LatchOwner, 'none'>) => {
      const result = acquireLatch(state.current, owner);
      if (!result.accepted) return false;
      state.current = result.state;
      closingSV.value = true;
      setClosing(true);
      return true;
    },
    [closingSV]
  );

  /** The dismiss drag released past the threshold. */
  const latchDrag = useCallback(() => void acquire('drag'), [acquire]);

  const close = useCallback(() => {
    if (acquire('cancel')) closeProp.current();
  }, [acquire]);

  const commit = useCallback(() => {
    if (!acquire('commit')) return;
    if (commitProp.current() === false) {
      state.current = releaseCommit(state.current);
      closingSV.value = false;
      setClosing(false);
    }
  }, [acquire, closingSV]);

  /** The dismiss drag's slide-out finished. */
  const dismissDone = useCallback(() => {
    if (dragOwnsClose(state.current)) closeProp.current();
  }, []);

  /** For effects and presses that must not run once the sheet is spent. */
  const isLatched = useCallback(() => state.current.owner !== 'none', []);

  useLayoutEffect(() => {
    registerClose.current = close;
    return () => {
      registerClose.current = null;
    };
  }, [registerClose, close]);

  return { closing, isLatched, latchDrag, close, commit, dismissDone };
}
