import { useLayoutEffect, useRef } from 'react';
import { useModalLayer } from '../../hooks/use-modal-layer';

/**
 * Modality for DetailPanel's two dialog views. The expanded view and the
 * mobile sheet are modal (the desktop sidebar is not): focus moves in, Tab
 * stays inside, the page behind is inert, and focus returns to the opener.
 * One layer per dialog, since each renders its own element. Each backdrop is
 * its dialog's sibling, so it is kept clickable explicitly.
 *
 * Collapsing the expanded view remounts the sidebar, so the expand button
 * that opened it is gone and the layer has no opener to return focus to.
 * Focus goes to the sidebar's new expand button instead of the page body.
 */
export function useDetailPanelLayers(
  isOpen: boolean,
  isMobile: boolean,
  isExpanded: boolean
) {
  const expandedBackdropRef = useRef<HTMLButtonElement>(null);
  const expandedDialogRef = useModalLayer<HTMLDialogElement>(
    isOpen && isExpanded,
    { keepInteractive: [expandedBackdropRef] }
  );
  const mobileBackdropRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useModalLayer<HTMLDialogElement>(
    isOpen && isMobile && !isExpanded,
    { keepInteractive: [mobileBackdropRef] }
  );

  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const wasExpandedRef = useRef(isExpanded);
  useLayoutEffect(() => {
    if (wasExpandedRef.current && !isExpanded) {
      expandButtonRef.current?.focus();
    }
    wasExpandedRef.current = isExpanded;
  }, [isExpanded]);

  return {
    expandedBackdropRef,
    expandedDialogRef,
    mobileBackdropRef,
    mobileDialogRef,
    expandButtonRef,
  };
}

/**
 * Close for the desktop sidebar. It is not modal, so it has no opener to
 * return focus to, and closing it removes the element that has focus. When
 * focus is inside it (or already lost), `returnFocus` runs first to put focus
 * back where the panel was opened from (#604). Focus elsewhere on the page,
 * such as the card that opened it, is left alone. The ref is null outside the
 * desktop sidebar, so the modal views close as before.
 */
export function useSidebarClose(
  onClose: () => void,
  returnFocus: (() => void) | undefined
) {
  const sidebarRef = useRef<HTMLElement>(null);
  const handleClose = () => {
    const active = document.activeElement;
    const sidebar = sidebarRef.current;
    if (
      sidebar &&
      (active === null || active === document.body || sidebar.contains(active))
    ) {
      returnFocus?.();
    }
    onClose();
  };
  return { sidebarRef, handleClose };
}
