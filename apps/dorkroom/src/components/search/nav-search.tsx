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
  PAGE_SEARCH_ID,
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

/**
 * Bring the page's own search box into view and focus it. Centred, so the
 * sticky header cannot cover it.
 */
function focusPageSearch() {
  const box = document
    .getElementById(PAGE_SEARCH_ID)
    ?.querySelector<HTMLInputElement>('[role="combobox"]');
  box?.scrollIntoView({ block: 'center' });
  box?.focus({ preventScroll: true });
}

export interface NavSearch {
  /** False on a page with its own search box, which the triggers focus. */
  opensDialog: boolean;
  /** A trigger's click: opens the dialog, or focuses the page's box. */
  openSearch: (event: MouseEvent<HTMLButtonElement>) => void;
  /** The dialog while open, else null. Render it once, anywhere. */
  dialog: ReactNode;
}

/**
 * The nav bar's search dialog: its open state, the search shortcut (Cmd+K,
 * Ctrl+K, or "/" outside a text field) and the lazily loaded dialog.
 *
 * On a page with its own search box (`pageSearch`, the home page) there is
 * no dialog: the triggers focus that box, and the box takes the shortcut
 * itself, so there is never a second search box. The dialog closes itself
 * when one of its links is followed; beyond that it is open only while the
 * pathname is the one it was opened at, so back and forward to another page
 * close it too, with no effect to sync. A page's own search param updates
 * (/films keeps its filters in the URL) leave it open.
 */
export function useNavSearch(pathname: string, pageSearch: boolean): NavSearch {
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  // Forget a dialog left behind by a navigation, so coming back to that
  // page does not reopen it.
  if (openedAt !== null && openedAt !== pathname) setOpenedAt(null);
  const open = !pageSearch && openedAt === pathname;

  useEffect(() => {
    if (pageSearch || open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return;
      event.preventDefault();
      setOpenedAt(pathname);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pageSearch, open, pathname]);

  return {
    opensDialog: !pageSearch,
    openSearch: (event) => {
      if (pageSearch) {
        focusPageSearch();
        return;
      }
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
  search: NavSearch;
  /** `header`: in the sm+ header. `fab`: floating beside the phone menu toggle. */
  variant: 'header' | 'fab';
}

/**
 * Opens the search dialog, or focuses the page's own box. In the header an
 * icon button like its neighbours, with the shortcut hint in its tooltip: the
 * header is capped at `max-w-6xl` and already as wide as that with the nav,
 * so a "Search" label and hint (about 100px more) would overflow it at every
 * width. On phones a round button beside the menu toggle, which the open
 * menu drawer covers.
 */
export function NavSearchButton({ search, variant }: NavSearchButtonProps) {
  const header = variant === 'header';
  const preload = search.opensDialog ? preloadSearchDialog : undefined;
  const button = (
    <button
      type="button"
      aria-label="Search"
      aria-haspopup={search.opensDialog ? 'dialog' : undefined}
      aria-keyshortcuts={SEARCH_KEYSHORTCUTS}
      onClick={search.openSearch}
      onPointerEnter={preload}
      onFocus={preload}
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
