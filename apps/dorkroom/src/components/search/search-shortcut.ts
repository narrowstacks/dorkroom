/**
 * The search shortcut and the page search box's id, shared by the nav
 * trigger (in every page's first load, so this module stays tiny) and the
 * search box itself.
 */

/** True when a key press lands in something the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Cmd+K / Ctrl+K from anywhere, or "/" outside a text field (so typing a
 * slash into an input still types it).
 */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  if (event.altKey) return false;
  if (event.key.toLowerCase() === 'k') {
    return (event.metaKey || event.ctrlKey) && !event.shiftKey;
  }
  return (
    event.key === '/' &&
    !event.metaKey &&
    !event.ctrlKey &&
    !isTypingTarget(event.target)
  );
}

const isApple = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** The hint a search control shows: "⌘K" on Apple devices, "Ctrl K" elsewhere. */
export const SEARCH_SHORTCUT_HINT = isApple ? '⌘K' : 'Ctrl K';

/** For `aria-keyshortcuts` on the controls the shortcut reaches. */
export const SEARCH_KEYSHORTCUTS = 'Meta+K Control+K /';

/**
 * The id of a page's own search panel (the home page's hero), whose box the
 * nav's Search buttons focus on that page instead of opening the dialog.
 */
export const PAGE_SEARCH_ID = 'site-search';
