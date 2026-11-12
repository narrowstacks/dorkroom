import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Keyboard, type ScrollView, TextInput, type View } from 'react-native';
import { fieldScrollTarget } from './stage-layout';

/** Waits for a tap to land its focus before looking for the focused field. */
const FOCUS_SETTLE_MS = 80;

/**
 * Keeps the focused text field inside a panel's scroll view in view. The panel
 * itself rises above the keyboard (see `DetentPanel`), which can leave less
 * room than the field's place in the content, so after the keyboard opens, and
 * after a tap that may have moved focus to another field, the view scrolls just
 * far enough to show it.
 *
 * The panel's height is moved on the UI thread, so the scroll view's own layout
 * is not a reliable measure of what is showing: `viewportHeight` says how tall
 * it is for a keyboard of the given height, from the same numbers the panel's
 * animation uses. The scroll position is the one this hook last set or the
 * view last reported at the end of a drag or fling.
 */
export function useKeepFieldVisible(
  scrollRef: RefObject<ScrollView | null>,
  contentRef: RefObject<View | null>,
  viewportHeight: (keyboardHeight: number) => number
) {
  const scrollY = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useRef(viewportHeight);
  useLayoutEffect(() => {
    viewport.current = viewportHeight;
  });

  const reveal = useCallback(
    (keyboardHeight: number) => {
      const field = TextInput.State.currentlyFocusedInput();
      const content = contentRef.current;
      if (!field || !content) return;
      field.measureLayout(
        content,
        (_x, fieldY, _width, fieldHeight) => {
          const target = fieldScrollTarget({
            fieldY,
            fieldHeight,
            scrollY: scrollY.current,
            viewportHeight: viewport.current(keyboardHeight),
          });
          if (target === null) return;
          scrollY.current = target;
          scrollRef.current?.scrollTo({ y: target, animated: true });
        },
        // Not inside this panel (a field elsewhere on the screen): nothing to do.
        () => {}
      );
    },
    [scrollRef, contentRef]
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      reveal(event.endCoordinates.height)
    );
    return () => {
      show.remove();
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [reveal]);

  // Stable, so callbacks built from it (the panel's strip gesture) are not
  // rebuilt on every render, mid-drag included.
  return useMemo(
    () => ({
      /** Forget the scroll position: the view has been sent back to the top. */
      resetScroll: () => {
        scrollY.current = 0;
      },
      onScrollSettled: (y: number) => {
        scrollY.current = y;
      },
      /** For the content's `onTouchEnd`: a tap may have focused another field. */
      onContentTouchEnd: () => {
        const metrics = Keyboard.metrics();
        if (!metrics) return;
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(
          () => reveal(metrics.height),
          FOCUS_SETTLE_MS
        );
      },
    }),
    [reveal]
  );
}
