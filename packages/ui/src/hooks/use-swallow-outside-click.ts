import { type RefObject, useEffect, useRef } from 'react';

/** How long after the releasing pointerup an outside press may still swallow its click. */
const OUTSIDE_CLICK_WINDOW_MS = 400;

/**
 * A press outside an open popup closes it (its input blurs), and the click
 * that press produces must not also land on whatever is underneath: on a
 * phone that opened the film or recipe card behind a filter list (#633).
 *
 * While `isOpen`, a pointerdown outside `rootRef` arms a one-shot swallow of
 * the click that follows, intercepted in the capture phase before React or a
 * dialog backdrop sees it. It disarms on pointercancel (a scroll or drag never
 * produces a click), on the click itself, and a short timer after pointerup.
 * The arm outlives `isOpen` on purpose: the popup closes 150ms after the blur,
 * which can land between a slow press and its click. Mouse and touch behave
 * alike, as a native select does. Focus is untouched, so pressing another
 * field still focuses it.
 */
export function useSwallowOutsideClick(
  rootRef: RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isOutside = (e: Event) =>
      !(e.target instanceof Node && rootRef.current?.contains(e.target));
    const disarm = () => {
      armed = false;
      clearTimeout(timer);
    };
    const onDown = (e: PointerEvent) => {
      disarm();
      armed = isOpenRef.current && isOutside(e);
    };
    const onUp = () => {
      if (!armed) return;
      clearTimeout(timer);
      timer = setTimeout(disarm, OUTSIDE_CLICK_WINDOW_MS);
    };
    const onClick = (e: MouseEvent) => {
      if (!armed) return;
      const outside = isOutside(e);
      disarm();
      if (!outside) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', disarm, true);
    window.addEventListener('click', onClick, true);
    return () => {
      disarm();
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', disarm, true);
      window.removeEventListener('click', onClick, true);
    };
  }, [rootRef]);
}
