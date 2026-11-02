import { type RefObject, useEffect, useRef } from 'react';

/** How long after the releasing pointerup an outside press may still swallow its click. */
const OUTSIDE_CLICK_WINDOW_MS = 400;

/**
 * A press outside an open popup closes it (its input blurs), and the click
 * that press produces must not also land on whatever is underneath: on a
 * phone that opened the film or recipe card behind a filter list (#633).
 *
 * While `isOpen`, a primary touch or pen press outside `rootRef` that ends in
 * pointerup calls `onOutsidePress` (so the caller closes the popup itself
 * instead of relying on the platform to blur, which iOS Safari sometimes does
 * not) and swallows the click that follows, intercepted in the capture phase
 * before React or a dialog backdrop sees it. A scroll or drag ends in
 * pointercancel instead: nothing closes and nothing is swallowed. The swallow
 * lasts until that click or 400ms after pointerup. Keyboard and programmatic
 * clicks (`detail === 0`) are never swallowed. Mouse clicks pass through, as in
 * other non-modal comboboxes (APG, React Aria, Headless UI).
 * Focus is not prevented, so pressing another field still focuses it.
 */
export function useSwallowOutsideClick(
  rootRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onOutsidePress?: () => void
) {
  const isOpenRef = useRef(isOpen);
  const onOutsidePressRef = useRef(onOutsidePress);
  useEffect(() => {
    isOpenRef.current = isOpen;
    onOutsidePressRef.current = onOutsidePress;
  }, [isOpen, onOutsidePress]);

  useEffect(() => {
    // `pressed`: an outside touch or pen press is in progress. `armed`: its
    // pointerup has happened, so the click that follows is swallowed until the
    // timer expires. Arming at pointerup means a lost pointerup can never leave
    // a stuck swallow, however long the press was held.
    let pressed = false;
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isOutside = (e: Event) =>
      !(e.target instanceof Node && rootRef.current?.contains(e.target));
    const disarm = () => {
      pressed = false;
      armed = false;
      clearTimeout(timer);
    };
    const onDown = (e: PointerEvent) => {
      disarm();
      if (!isOpenRef.current || !isOutside(e)) return;
      if (e.pointerType === 'mouse' || !e.isPrimary || e.button !== 0) return;
      pressed = true;
    };
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      armed = true;
      // A scroll ends in pointercancel instead, so the list and keyboard stay
      // open through a page scroll.
      onOutsidePressRef.current?.();
      clearTimeout(timer);
      timer = setTimeout(disarm, OUTSIDE_CLICK_WINDOW_MS);
    };
    const onClick = (e: MouseEvent) => {
      if (!armed) return;
      if (e.detail === 0) {
        disarm();
        return;
      }
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
