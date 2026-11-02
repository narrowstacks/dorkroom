import { type RefObject, useLayoutEffect, useRef } from 'react';

/**
 * Makes an element behave as the modal it claims to be (`aria-modal="true"`):
 * focus moves in when it opens, Tab stays inside, everything else on the page
 * is `inert` (unclickable, unfocusable, hidden from assistive tech), and focus
 * goes back to the opener when it closes.
 *
 * Why not native `showModal()`: it moves the dialog into the browser's top
 * layer, which no z-index can rise above. The toast that reports "Link
 * copied" from inside the film detail sheet, and the tooltips portalled to
 * `document.body`, would then render beneath the dialog's backdrop. Setting
 * `inert` on the rest of the page gives the same modality and leaves stacking
 * to z-index. Escape stays with `useEscapeKey` and scroll locking with
 * `useBodyScrollLock`; this hook owns focus and inertness only.
 */

/** What Tab can reach inside the layer. */
const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/**
 * `document.body` children never made inert. Live regions stay announced (the
 * toast is portalled to the body for this reason), and non-rendered elements
 * are skipped as noise.
 */
const NEVER_INERT =
  '[aria-live], [role="status"], [role="alert"], script, style, link, template';

function tabbablesIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) => !element.closest('[hidden], [inert]')
  );
}

interface ModalLayer {
  /** The modal element itself. */
  element: HTMLElement;
  /** Elements outside `element` that stay interactive while it is on top. */
  keep: HTMLElement[];
}

/**
 * Open modal layers, last-opened last. Only the top one is interactive: a
 * modal opened over another makes the one beneath inert too.
 */
const layers: ModalLayer[] = [];
/** Elements this module made inert, so it never clears an author's `inert`. */
const madeInert = new Set<Element>();

/**
 * Re-derive inertness from the top layer: clear everything this module set,
 * then walk down from `document.body`, making inert every subtree that holds
 * none of the top layer's kept elements and descending into the ones that do.
 * The result is that exactly the kept elements (and the live regions) remain
 * reachable, wherever in the tree they sit.
 */
function syncInert(): void {
  for (const element of madeInert) element.removeAttribute('inert');
  madeInert.clear();

  const top = layers.at(-1);
  if (!top) return;
  const keep = [top.element, ...top.keep];

  const visit = (parent: Element) => {
    for (const child of parent.children) {
      if (keep.some((kept) => kept === child)) continue;
      if (keep.some((kept) => child.contains(kept))) {
        visit(child);
        continue;
      }
      if (child.hasAttribute('inert') || child.matches(NEVER_INERT)) continue;
      child.setAttribute('inert', '');
      madeInert.add(child);
    }
  };
  visit(document.body);
}

/**
 * Tab from the last tabbable element wraps to the first, Shift+Tab from the
 * first wraps to the last, and Tab from anywhere else that isn't tabbable
 * (the layer itself, after a click on its padding) goes to the near end.
 * Attached natively, so a nested layer portalled out of this one's React
 * subtree never sees this handler.
 */
function trapTab(this: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return;
  const tabbable = tabbablesIn(this);
  const first = tabbable[0];
  const last = tabbable.at(-1);
  if (!first || !last) {
    // Nothing to tab to: stay on the layer rather than leave it.
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  const edge = event.shiftKey ? first : last;
  if (active === edge || !tabbable.some((element) => element === active)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export interface UseModalLayerOptions {
  /**
   * Where focus goes on open. Defaults to the first tabbable element, then to
   * the layer itself (give it `tabIndex={-1}`). Ignored when something inside
   * the layer already has focus.
   */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * Elements outside the layer that must stay clickable while it is open, such
   * as a toggle button that sits above the layer or a backdrop rendered as its
   * sibling.
   */
  keepInteractive?: readonly RefObject<HTMLElement | null>[];
}

/**
 * Turn the element behind the returned ref into a modal while `isOpen`.
 *
 * Runs in a layout effect so the opener is read before any child's passive
 * mount effect moves focus inside, and so the page turns inert in the same
 * frame the layer paints.
 *
 * @param isOpen - Whether the layer is open. The element must be mounted
 *   whenever this is true.
 * @param options - Initial focus target and elements to keep interactive.
 * @returns A ref to attach to the modal element.
 */
export function useModalLayer<T extends HTMLElement>(
  isOpen: boolean,
  options: UseModalLayerOptions = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const optionsRef = useRef(options);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!isOpen || !element) return undefined;
    const { initialFocus, keepInteractive = [] } = optionsRef.current;

    const active = document.activeElement;
    const opener =
      active instanceof HTMLElement && !element.contains(active)
        ? active
        : null;

    const layer: ModalLayer = {
      element,
      keep: keepInteractive
        .map((kept) => kept.current)
        .filter((kept): kept is HTMLElement => kept !== null),
    };
    layers.push(layer);
    syncInert();
    element.addEventListener('keydown', trapTab);

    if (!element.contains(document.activeElement)) {
      (initialFocus?.current ?? tabbablesIn(element)[0] ?? element).focus();
    }

    return () => {
      element.removeEventListener('keydown', trapTab);
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
      syncInert();
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  return ref;
}
