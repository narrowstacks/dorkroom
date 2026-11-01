import { Modal } from '@dorkroom/ui';
import type { MouseEvent } from 'react';
import { SearchPanel } from './search-panel';

interface SearchDialogProps {
  onClose: () => void;
}

/**
 * The nav bar's search: the home page's search panel in a dialog. A full
 * height sheet on phones, which keeps the box clear of the keyboard. From
 * `sm` up a wide panel pinned near the top of the screen, as tall as its
 * content (so answers grow it downward only) up to the screen's height,
 * then scrolling. `Modal` owns the portal, backdrop, Escape, focus trap and
 * focus return.
 *
 * Loaded lazily by `nav-search.tsx` (the default export is for
 * `React.lazy`), so the search code stays out of every page's first load.
 */
export default function SearchDialog({ onClose }: SearchDialogProps) {
  // Following a result or an answer's link closes the dialog, also when the
  // link is the page already open (no location change to close it). A
  // modified click opens a new tab and leaves the dialog be.
  const closeOnLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button === 0 &&
      !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    ) {
      onClose();
    }
  };
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Search"
      size="lg"
      className="max-sm:fixed max-sm:inset-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:flex-col max-sm:rounded-none max-sm:border-0 max-sm:p-4 max-sm:pt-[calc(env(safe-area-inset-top)+1rem)] sm:mt-[8vh] sm:self-start"
      // The scrolling body clips what overflows it, the box's focus ring
      // included: -m-1 p-1 gives the ring room without moving the content.
      bodyClassName="-m-1 p-1 max-sm:max-h-none max-sm:min-h-0 max-sm:flex-1 max-sm:pb-[calc(env(safe-area-inset-bottom)+0.25rem)] sm:max-h-[calc(92dvh-8rem)]"
    >
      <SearchPanel variant="dialog" onNavigate={closeOnLink} />
    </Modal>
  );
}
