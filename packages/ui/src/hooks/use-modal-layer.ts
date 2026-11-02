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

/**
 * Whether the element is rendered: not `display: none` or
 * `visibility: hidden`, itself or through an ancestor. `checkVisibility` is
 * in every current browser; where it is missing (older Safari, test DOMs)
 * only the `[hidden]` check in `tabbablesIn` applies.
 */
function isRendered(element: HTMLElement): boolean {
  if (!('checkVisibility' in element)) return true;
  return element.checkVisibility({
    visibilityProperty: true,
    checkVisibilityCSS: true,
  });
}

/**
 * Radio buttons take one Tab stop per group: the checked one, or the first
 * one when none is checked.
 */
function isRadioTabStop(
  element: HTMLElement,
  candidates: readonly HTMLElement[]
): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== 'radio') {
    return true;
  }
  if (!element.name) return true;
  const group = candidates.filter(
    (other): other is HTMLInputElement =>
      other instanceof HTMLInputElement &&
      other.type === 'radio' &&
      other.name === element.name &&
      other.form === element.form
  );
  const checked = group.find((radio) => radio.checked);
  return checked ? checked === element : group[0] === element;
}

/**
 * Whether a disabled `<fieldset>` disables the element. `:disabled` covers
 * this in browsers; the explicit walk keeps it true in test DOMs too. A
 * control in the fieldset's first `<legend>` stays enabled, per the HTML spec.
 */
function isDisabled(element: HTMLElement): boolean {
  if (element.matches(':disabled')) return true;
  for (
    let fieldset = element.closest('fieldset');
    fieldset;
    fieldset = fieldset.parentElement?.closest('fieldset') ?? null
  ) {
    if (!fieldset.disabled) continue;
    const legend = fieldset.querySelector(':scope > legend');
    if (!legend?.contains(element)) return true;
  }
  return false;
}

function tabbablesIn(root: HTMLElement): HTMLElement[] {
  const candidates = [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) =>
      !element.closest('[hidden], [inert]') &&
      // A native control taken out of the Tab order with a negative tabindex.
      !element.matches('[tabindex^="-"]') &&
      // Covers a control inside a disabled <fieldset>, which [disabled] misses.
      !isDisabled(element) &&
      isRendered(element)
  );
  return candidates.filter((element) => isRadioTabStop(element, candidates));
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
  /**
   * Where focus goes on close, when the element that had focus at open time
   * is not the right place (or may be gone by then).
   */
  returnFocus?: RefObject<HTMLElement | null>;
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
  /** Where focus belongs after a close that kept the element mounted. */
  const pendingReturnRef = useRef<{
    target: HTMLElement;
    layer: HTMLElement;
  } | null>(null);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useLayoutEffect(() => {
    // A close that leaves the element mounted (a drawer sliding out) runs the
    // cleanup below during React's mutation phase, and React then puts focus
    // back on whatever had it before the commit, inside the closing layer.
    // This run comes after that, so it settles focus where it belongs, unless
    // something else (a component's own layout effect) already moved it out.
    const pending = pendingReturnRef.current;
    pendingReturnRef.current = null;
    if (pending && !isOpen) {
      const active = document.activeElement;
      if (
        pending.target.isConnected &&
        (active === null ||
          active === document.body ||
          pending.layer.contains(active))
      ) {
        pending.target.focus();
      }
    }

    const element = ref.current;
    if (!isOpen || !element) return undefined;
    const {
      initialFocus,
      keepInteractive = [],
      returnFocus,
    } = optionsRef.current;

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
      // A layer that closes beneath another (out of order) must not pull
      // focus out of the layer still on top.
      const wasTop = index !== -1 && index === layers.length - 1;
      if (index !== -1) layers.splice(index, 1);
      syncInert();
      if (!wasTop) return;
      // The opener can be gone by now (a confirmed delete unmounts the card
      // and its Delete button), so fall back to the layer now on top.
      // Read at close on purpose: the target is whatever the ref holds now.
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- the latest ref value is the point, not a snapshot from open time
      const returnTarget = returnFocus?.current;
      const target = [returnTarget, opener, layers.at(-1)?.element].find(
        (candidate) => candidate?.isConnected
      );
      if (!target) return;
      target.focus();
      pendingReturnRef.current = { target, layer: element };
    };
  }, [isOpen]);

  return ref;
}
