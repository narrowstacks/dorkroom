import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../../components/confirm-modal';
import { DetailPanel } from '../../components/detail-panel/detail-panel';

/** The page behind the panel: its trigger, in the app's own root. */
function Page({ isOpen, isMobile }: { isOpen: boolean; isMobile: boolean }) {
  return (
    <main>
      <button type="button">Open film</button>
      <DetailPanel
        isOpen={isOpen}
        onClose={vi.fn()}
        isMobile={isMobile}
        ariaLabel="Film details"
      >
        <a href="#film">Film link</a>
      </DetailPanel>
    </main>
  );
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('DetailPanel modality (#286)', () => {
  it('makes the mobile sheet modal: focus in, page inert, focus back on close', () => {
    const { rerender } = render(<Page isOpen={false} isMobile />);
    const opener = screen.getByRole('button', { name: 'Open film' });
    opener.focus();

    rerender(<Page isOpen isMobile />);
    screen.getByRole('dialog', { name: 'Film details' });
    // Not the pointer-only drag handle, which does nothing from the keyboard.
    expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();
    expect(opener.closest('[inert]')).not.toBeNull();
    // The sheet's own backdrop still closes it on tap.
    expect(
      screen
        .getByRole('button', { name: 'Close', hidden: true })
        .closest('[inert]')
    ).toBeNull();

    rerender(<Page isOpen={false} isMobile />);
    expect(opener).toHaveFocus();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('leaves the desktop sidebar non-modal', () => {
    render(<Page isOpen isMobile={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('makes the expanded view modal, and the page interactive again on collapse', () => {
    render(<Page isOpen isMobile={false} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Expand to full screen' })
    );

    const expanded = screen.getByRole('dialog', { name: 'Film details' });
    expect(expanded.contains(document.activeElement)).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Open film' }).closest('[inert]')
    ).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();
    // The expand button that opened it was remounted with the sidebar.
    expect(
      screen.getByRole('button', { name: 'Expand to full screen' })
    ).toHaveFocus();
  });

  it('hands the sheet back to the user when a confirm above it closes', () => {
    const { rerender } = render(
      <>
        <Page isOpen isMobile />
        <ConfirmModal
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete"
          message="Sure?"
        />
      </>
    );
    const link = screen.getByRole('link', { name: 'Film link' });
    link.focus();

    rerender(
      <>
        <Page isOpen isMobile />
        <ConfirmModal
          isOpen
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete"
          message="Sure?"
        />
      </>
    );
    expect(link.closest('[inert]')).not.toBeNull();

    rerender(
      <>
        <Page isOpen isMobile />
        <ConfirmModal
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete"
          message="Sure?"
        />
      </>
    );
    expect(link).toHaveFocus();
    expect(link.closest('[inert]')).toBeNull();
  });
});
