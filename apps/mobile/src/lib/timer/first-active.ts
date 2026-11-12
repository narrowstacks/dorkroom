// "Has the app been in front yet?" Work that destroys state (ending leftover
// Live Activities, cancelling every scheduled alert) must not run when iOS
// launches the app in the background for a Lock Screen button press: the run
// is gone from memory but its activity and alerts are still valid. It waits for
// the first time the app is active. The source is injectable for tests.
export interface AppStateSource {
  currentState: string;
  addEventListener: (
    type: 'change',
    listener: (state: string) => void
  ) => { remove: () => void };
}

export interface FirstActive {
  /** Whether the app has been active since this process started. */
  hasBeenActive: () => boolean;
  /** Run `fn` once the app is first active (now, if it already is). Returns a cancel. */
  onFirstActive: (fn: () => void) => () => void;
}

export function createFirstActive(source: AppStateSource): FirstActive {
  let active = source.currentState === 'active';
  const waiting = new Set<() => void>();
  const subscription = active
    ? null
    : source.addEventListener('change', (state) => {
        if (state !== 'active') return;
        active = true;
        subscription?.remove();
        const run = [...waiting];
        waiting.clear();
        for (const fn of run) fn();
      });

  return {
    hasBeenActive: () => active,
    onFirstActive: (fn) => {
      if (active) {
        fn();
        return () => {};
      }
      waiting.add(fn);
      return () => {
        waiting.delete(fn);
      };
    },
  };
}
