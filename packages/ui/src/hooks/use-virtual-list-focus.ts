import {
  type FocusEvent,
  type Ref,
  type RefObject,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';

/**
 * Keeps keyboard focus on a virtualized list's items when the list re-renders
 * them, and lets a caller put focus back on an item by key.
 *
 * A virtualized card grid lays its cards out in row containers, so a column
 * count change (the desktop detail sidebar opening or closing narrows the
 * grid) moves every card into a different row and React remounts it. The card
 * that had focus is gone and focus falls to `<body>`. This hook notices that
 * (the element it last saw focused is disconnected and nothing else has
 * focus) and focuses the same control in the item's new element.
 *
 * That only works when the new element is rendered in the same commit, so a
 * grid keeps the focused item's row in its virtual window with
 * `keepFocusedInRange` (pass it the virtualizer's `rangeExtractor`). That also
 * stops the focused card from virtualizing away when the list is scrolled
 * past it. The remount path never scrolls: a list whose focused item did
 * leave the window (the table, scrolled far enough) simply loses focus, as
 * any virtualized list does, rather than fighting the user's scroll.
 *
 * Spread `containerProps` on the scroll container. Each item's root carries
 * `data-list-item-key`. The control that had focus is found again by its
 * position among the item's focusable controls, so focus on a card's Delete
 * button comes back to that card's Delete button.
 *
 * The scroll container is the fallback when the item is no longer in the list
 * (filtered out, deleted), so give it `tabIndex={-1}`.
 */

/** Controls that can take focus inside an item. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * How long to wait for an item scrolled into the window to render before
 * settling on the fallback.
 */
const RENDER_WAIT_MS = 500;

/** Imperative handle a list exposes so a page can return focus to an item. */
export interface VirtualListFocusHandle {
  /**
   * Focus the item with this key: its first focusable control, or the item
   * itself when it is focusable. Scrolls it into the rendered window when
   * needed, and focuses the list's scroll container when the key is gone.
   */
  focusItem: (key: string) => void;
}

export interface UseVirtualListFocusOptions {
  /** The list's scroll container; also the fallback focus target. */
  containerRef: RefObject<HTMLElement | null>;
  /** Every item's key, in list order (not just the rendered ones). */
  keys: readonly string[];
  /**
   * Scroll the item at this index (into `keys`) into the rendered window.
   * Used by `focusItem` only.
   */
  scrollToIndex: (index: number) => void;
  /** Receives the `focusItem` handle. */
  handleRef?: Ref<VirtualListFocusHandle>;
  /**
   * Fallback focus target while the scroll container is not rendered (an
   * empty state in its place). Give it `tabIndex={-1}` too.
   */
  fallbackRef?: RefObject<HTMLElement | null>;
}

/** Spread onto the scroll container. */
export interface VirtualListFocusProps {
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
}

export interface VirtualListFocus {
  /** Spread onto the scroll container. */
  containerProps: VirtualListFocusProps;
  /**
   * Index (into `keys`) of the item whose control has focus, or -1. Read it
   * while rendering, such as from the virtualizer's `rangeExtractor`.
   */
  focusedIndex: () => number;
}

/**
 * Add `index` to a virtualizer range (sorted row indexes) so that row stays
 * rendered: the focused item's row, so it neither unmounts when scrolled out
 * of view nor lands outside the window when a column change moves it.
 * A negative index leaves the range as it is.
 */
export function keepFocusedInRange(range: number[], index: number): number[] {
  if (index < 0 || range.includes(index)) return range;
  return [...range, index].sort((a, b) => a - b);
}

interface FocusTarget {
  key: string;
  /** Position of the control among the item's focusable controls. */
  control: number;
  /** When the wait for the item to render began (`performance.now()`). */
  scrolledAt?: number;
  /**
   * What had focus when the wait began. Focus anywhere else by the time the
   * item renders means someone moved it on purpose, so the wait is dropped.
   */
  from?: Element | null;
}

function focusablesIn(item: HTMLElement): HTMLElement[] {
  const inner = [...item.querySelectorAll<HTMLElement>(FOCUSABLE)];
  return item.matches(FOCUSABLE) ? [item, ...inner] : inner;
}

function findItem(container: HTMLElement, key: string): HTMLElement | null {
  for (const item of container.querySelectorAll<HTMLElement>(
    '[data-list-item-key]'
  )) {
    if (item.dataset.listItemKey === key) return item;
  }
  return null;
}

function isFocusLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body;
}

/**
 * @param options - The scroll container, item keys, scroll callback and the
 *   ref that receives the `focusItem` handle.
 */
export function useVirtualListFocus({
  containerRef,
  keys,
  scrollToIndex,
  handleRef,
  fallbackRef,
}: UseVirtualListFocusOptions): VirtualListFocus {
  /** The item control that last had focus, while it (or its remount) does. */
  const lastRef = useRef<{ element: HTMLElement; target: FocusTarget } | null>(
    null
  );
  /** An item waiting to be focused once it renders. */
  const pendingRef = useRef<FocusTarget | null>(null);
  const latestRef = useRef({ keys, scrollToIndex });
  const frameRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    latestRef.current = { keys, scrollToIndex };
  });

  useLayoutEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  /** Focus the pending item if it is rendered; scroll to it if it is not. */
  const settlePending = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    if (!isFocusLost() && document.activeElement !== pending.from) {
      pendingRef.current = null;
      return;
    }
    const container = containerRef.current;
    if (!container) {
      // Nothing rendered to look in (an empty state): settle on the fallback.
      pendingRef.current = null;
      fallbackRef?.current?.focus({ preventScroll: true });
      return;
    }
    const index = latestRef.current.keys.indexOf(pending.key);
    const item = index === -1 ? null : findItem(container, pending.key);
    if (item) {
      pendingRef.current = null;
      const controls = focusablesIn(item);
      (controls[pending.control] ?? controls[0] ?? item).focus();
      return;
    }
    if (index !== -1) {
      const now = performance.now();
      if (pending.scrolledAt === undefined) {
        pending.scrolledAt = now;
        latestRef.current.scrollToIndex(index);
      }
      if (now - pending.scrolledAt < RENDER_WAIT_MS) {
        // The virtualizer renders the item a frame or two after the scroll.
        // Renders in between retry too; the frame loop covers a quiet list.
        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            settlePending();
          });
        }
        return;
      }
    }
    // Gone from the list, or still not rendered after scrolling to it.
    pendingRef.current = null;
    container.focus({ preventScroll: true });
  };

  useImperativeHandle(handleRef, () => ({
    focusItem: (key: string) => {
      pendingRef.current = {
        key,
        control: 0,
        from: document.activeElement,
      };
      settlePending();
    },
  }));

  // Track the focused item control. Focus leaving for another element ends
  // the tracking; focus leaving for nowhere only ends it when the control is
  // still in the document (a click on empty space), not when it was removed.
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    const container = event.currentTarget;
    const control = event.target;
    const item = control.closest<HTMLElement>('[data-list-item-key]');
    const key = item?.dataset.listItemKey;
    lastRef.current =
      item && key !== undefined && container.contains(item)
        ? {
            element: control,
            target: { key, control: focusablesIn(item).indexOf(control) },
          }
        : null;
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    const container = event.currentTarget;
    const control = event.target;
    if (event.relatedTarget instanceof Node) {
      if (!container.contains(event.relatedTarget)) lastRef.current = null;
      return;
    }
    queueMicrotask(() => {
      if (lastRef.current?.element === control && control.isConnected) {
        lastRef.current = null;
      }
    });
  };

  // After every render: if the focused control was remounted away, follow it
  // to its new element. Runs before paint, so focus never visibly drops. Only
  // an element rendered in this same commit counts; anything else means the
  // item left the window, and focus is not dragged back to it (no scrolling).
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs after every render on purpose: any render can remount the focused item
  useLayoutEffect(() => {
    const last = lastRef.current;
    if (last && !last.element.isConnected && isFocusLost()) {
      lastRef.current = null;
      const container = containerRef.current;
      const item = container && findItem(container, last.target.key);
      if (item) {
        const controls = focusablesIn(item);
        (controls[last.target.control] ?? controls[0] ?? item).focus();
      }
    }
    settlePending();
  });

  const focusedIndex = () => {
    const last = lastRef.current;
    return last ? keys.indexOf(last.target.key) : -1;
  };

  return { containerProps: { onFocus, onBlur }, focusedIndex };
}
