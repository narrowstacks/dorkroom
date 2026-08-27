import { useEffect, useRef } from 'react';

/** A stack entry: a stable box holding the layer's current dismiss callback. */
type DismissHandlerRef = { current: () => void };

/**
 * Every currently-enabled dismissible layer, in registration order (effect
 * flush order), last-enabled last.
 *
 * Escape dismisses whichever layer registered most recently, not necessarily
 * the topmost in z-order. For layers enabled in separate commits, which is
 * every real call site today, effect-flush order matches open order and
 * therefore matches stacking order, so last-enabled and topmost coincide. Two
 * layers enabled within the *same* commit would register in React tree order
 * instead, which has no relationship to z-order; that situation doesn't occur
 * in this codebase, so the simpler last-enabled rule is sufficient. Two
 * dialogs really are open at once on the recipes page:
 * `development-recipes-page.tsx` renders `ConfirmModal` as a sibling of the
 * recipe-detail dialog, and `useCustomRecipeCrud.ts`'s
 * `handleDeleteCustomRecipe` only opens the confirm without closing the
 * detail, each in its own commit. One plain `document` listener per
 * component would close both layers on a single keypress.
 */
const dismissStack: DismissHandlerRef[] = [];

function handleDocumentKeyDown(event: KeyboardEvent) {
  // A nested control that owns Escape itself cancels the event first, so an
  // open `SearchableSelect` inside a dialog closes without closing the dialog
  // (see `searchable-select.tsx`, which calls `preventDefault` on Escape).
  // `isComposing` guards IME candidate windows: a CJK user pressing Escape to
  // cancel a composition candidate must not also dismiss the dialog and lose
  // their form input.
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
    return;
  }
  dismissStack.at(-1)?.current();
}

/**
 * Dismiss the most-recently-registered enabled layer when the user presses
 * Escape.
 *
 * @param isEnabled - Whether this layer is currently open. Nothing is
 *   registered while `false`.
 * @param onEscape - Called when Escape reaches `document` and this layer was
 *   the last one registered. May be a fresh closure on every render.
 */
export function useEscapeKey(isEnabled: boolean, onEscape: () => void): void {
  const onEscapeRef = useRef(onEscape);

  // Refresh the callback in place rather than re-running the registration
  // effect: re-registering on every render would pop and re-push this layer,
  // pushing an outer layer above an inner one whenever the outer re-renders.
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    dismissStack.push(onEscapeRef);
    if (dismissStack.length === 1) {
      document.addEventListener('keydown', handleDocumentKeyDown);
    }

    return () => {
      const index = dismissStack.lastIndexOf(onEscapeRef);
      if (index !== -1) {
        dismissStack.splice(index, 1);
      }
      if (dismissStack.length === 0) {
        document.removeEventListener('keydown', handleDocumentKeyDown);
      }
    };
  }, [isEnabled]);
}
