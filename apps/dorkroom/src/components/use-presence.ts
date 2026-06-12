import { useEffect, useReducer } from 'react';

interface PresenceState {
  mounted: boolean;
  visible: boolean;
}

type PresenceAction =
  | { type: 'mount' }
  | { type: 'enter' }
  | { type: 'exit' }
  | { type: 'unmount' };

function presenceReducer(
  state: PresenceState,
  action: PresenceAction
): PresenceState {
  switch (action.type) {
    case 'mount':
      return { ...state, mounted: true };
    case 'enter':
      return { mounted: true, visible: true };
    case 'exit':
      return { ...state, visible: false };
    case 'unmount':
      return { mounted: false, visible: false };
    default:
      return state;
  }
}

/**
 * Drives mount + visibility for an enter/exit-transitioned overlay.
 *
 * The element stays mounted through its exit transition, then unmounts.
 * Unmounting on close is deliberate: a permanently mounted full-viewport
 * `position: fixed` overlay leaves a stale composited tile behind iOS Safari's
 * dynamic toolbar that is never invalidated until the page reloads. Destroying
 * the element destroys its compositing layer (and the stale tile) outright.
 *
 * `visible` flips on the frame after mount so the enter transition runs, and
 * flips off immediately on close so the exit transition runs. State lives in a
 * reducer so the mount → enter → exit → unmount sequence is a single
 * transition machine rather than cascading setState calls.
 */
export function usePresence(
  isOpen: boolean,
  exitDurationMs: number
): PresenceState {
  const [state, dispatch] = useReducer(presenceReducer, {
    mounted: isOpen,
    visible: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      dispatch({ type: 'mount' });
      // Two frames: commit the closed styles first, then flip to visible so
      // the CSS enter transition actually runs.
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => dispatch({ type: 'enter' }));
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }

    dispatch({ type: 'exit' });
    // Unmount after the exit transition (a no-op delay in themes where
    // transitions are globally disabled).
    const timeout = setTimeout(
      () => dispatch({ type: 'unmount' }),
      exitDurationMs
    );
    return () => clearTimeout(timeout);
  }, [isOpen, exitDurationMs]);

  return state;
}
