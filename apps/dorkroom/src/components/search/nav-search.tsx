import { cn, Tooltip } from '@dorkroom/ui';
import { Search } from 'lucide-react';
import {
  lazy,
  type MouseEvent,
  type ReactNode,
  Suspense,
  useEffect,
  useState,
} from 'react';
import { MOBILE_FAB, MOBILE_FAB_SECOND } from '../mobile-fab';
import {
  isSearchShortcut,
  SEARCH_KEYSHORTCUTS,
  SEARCH_SHORTCUT_HINT,
} from './search-shortcut';

// The dialog, and with it the search panel and searchHome, loads on first
// use: this module is in every page's first load, so it holds only the
// triggers and the shortcut.
const loadSearchDialog = () => import('./search-dialog');
const SearchDialog = lazy(loadSearchDialog);

/** Start fetching the dialog's code while the pointer or focus is on a trigger. */
const preloadSearchDialog = () => {
  void loadSearchDialog();
};

export interface NavSearch {
  /** Open the dialog from a trigger's click. */
  openSearch: (event: MouseEvent<HTMLButtonElement>) => void;
  /** The dialog while open, else null. Render it once, anywhere. */
  dialog: ReactNode;
}

/**
 * The nav bar's search dialog: its open state, the search shortcut (Cmd+K,
 * Ctrl+K, or "/" outside a text field) and the lazily loaded dialog.
 *
 * Off while `enabled` is false (the home page, whose own search box takes
 * the shortcut). The dialog closes itself when one of its links is followed;
 * beyond that it is open only while the pathname is the one it was opened
 * at, so back and forward to another page close it too, with no effect to
 * sync. A page's own search param updates (/films keeps its filters in the
 * URL) leave it open.
 */
export function useNavSearch(pathname: string, enabled: boolean): NavSearch {
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  // Forget a dialog left behind by a navigation, so coming back to that
  // page does not reopen it.
  if (openedAt !== null && openedAt !== pathname) setOpenedAt(null);
  const open = enabled && openedAt === pathname;

  useEffect(() => {
    if (!enabled || open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      setOpenedAt(pathname);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, open, pathname]);

  return {
    openSearch: (event) => {
      // Safari does not focus a clicked button; focus it so the dialog hands
      // focus back to it on close.
      event.currentTarget.focus();
      setOpenedAt(pathname);
    },
    dialog: open ? (
      <Suspense fallback={null}>
        <SearchDialog onClose={() => setOpenedAt(null)} />
      </Suspense>
    ) : null,
  };
}

interface NavSearchButtonProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** `header`: in the sm+ header. `fab`: floating beside the phone menu toggle. */
  variant: 'header' | 'fab';
}

/**
 * Opens the search dialog. In the header an icon button like its neighbours,
 * with the shortcut hint in its tooltip: the header is capped at `max-w-6xl`
 * and already as wide as that with the nav, so a "Search" label and hint
 * (about 100px more) would overflow it at every width. On phones a round
 * button beside the menu toggle, which the open menu drawer covers.
 */
export function NavSearchButton({ onClick, variant }: NavSearchButtonProps) {
  const header = variant === 'header';
  const button = (
    <button
      type="button"
      aria-label="Search"
      aria-haspopup="dialog"
      aria-keyshortcuts={SEARCH_KEYSHORTCUTS}
      onClick={onClick}
      onPointerEnter={preloadSearchDialog}
      onFocus={preloadSearchDialog}
      className={cn(
        'flex items-center justify-center rounded-full border border-[color:var(--color-border-secondary)] text-[color:var(--color-text-primary)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
        header
          ? 'nav-button size-9'
          : cn(
              MOBILE_FAB,
              MOBILE_FAB_SECOND,
              'z-50 bg-[color:var(--color-surface)]'
            )
      )}
    >
      <Search aria-hidden className={header ? 'size-4' : 'size-5'} />
    </button>
  );
  return header ? (
    <Tooltip label={`Search (${SEARCH_SHORTCUT_HINT})`}>{button}</Tooltip>
  ) : (
    button
  );
}
