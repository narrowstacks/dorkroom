import { type RefObject, useEffect, useRef } from 'react';

/** How long after the releasing pointerup an outside press may still swallow its click. */
const OUTSIDE_CLICK_WINDOW_MS = 400;
/** Upper bound on an arm's life, in case pointerup and pointercancel are both lost. */
const MAX_ARM_MS = 1500;

/**
 * A press outside an open popup closes it (its input blurs), and the click
 * that press produces must not also land on whatever is underneath: on a
 * phone that opened the film or recipe card behind a filter list (#633).
 *
 * While `isOpen`, a primary touch or pen pointerdown outside `rootRef` arms a
 * one-shot swallow of the click that follows, intercepted in the capture phase
 * before React or a dialog backdrop sees it, and calls `onOutsidePress` so the
 * caller can close the popup itself instead of relying on the platform to blur
 * (iOS Safari sometimes does not). It disarms on pointercancel (a scroll or
 * drag never produces a click), on the click itself, on a short timer after
 * pointerup, and at a hard cap after pointerdown. Keyboard and programmatic
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
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let capTimer: ReturnType<typeof setTimeout> | undefined;
    const isOutside = (e: Event) =>
      !(e.target instanceof Node && rootRef.current?.contains(e.target));
    const disarm = () => {
      armed = false;
      clearTimeout(timer);
      clearTimeout(capTimer);
    };
    const onDown = (e: PointerEvent) => {
      disarm();
      if (!isOpenRef.current || !isOutside(e)) return;
      if (e.pointerType === 'mouse' || !e.isPrimary || e.button !== 0) return;
      armed = true;
      capTimer = setTimeout(disarm, MAX_ARM_MS);
      onOutsidePressRef.current?.();
    };
    const onUp = () => {
      if (!armed) return;
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
