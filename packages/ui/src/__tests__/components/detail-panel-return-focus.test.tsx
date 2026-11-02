import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailPanel } from '../../components/detail-panel/detail-panel';

/**
 * The desktop sidebar is not modal, so it has no opener to return focus to.
 * Closing it with focus inside asks the page to put focus back (#604). The
 * mobile sheet is modal and returns focus to its opener, asking the page only
 * when that opener was remounted while the sheet was open.
 */
describe('DetailPanel returnFocus', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  const renderPanel = (isMobile: boolean) => {
    const calls: string[] = [];
    const onClose = vi.fn(() => calls.push('close'));
    const returnFocus = vi.fn(() => calls.push('returnFocus'));
    render(
      <>
        <button type="button">Opener</button>
        <DetailPanel
          isOpen
          onClose={onClose}
          returnFocus={returnFocus}
          isMobile={isMobile}
          ariaLabel="Film details"
          showExpandButton={false}
        >
          <button type="button">Share</button>
        </DetailPanel>
      </>
    );
    return { calls, onClose, returnFocus };
  };

  it('asks for focus back before closing from the close button', () => {
    const { calls } = renderPanel(false);
    const close = screen.getByRole('button', { name: 'Close panel' });
    close.focus();

    fireEvent.click(close);

    expect(calls).toEqual(['returnFocus', 'close']);
  });

  it('asks for focus back when Escape closes it with focus inside', () => {
    const { returnFocus, onClose } = renderPanel(false);
    screen.getByRole('button', { name: 'Share' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(returnFocus).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves focus alone when Escape closes it with focus elsewhere', () => {
    const { returnFocus, onClose } = renderPanel(false);
    screen.getByRole('button', { name: 'Opener' }).focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(returnFocus).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('mobile sheet', () => {
    /** A card that opens the sheet; `generation` remounts it, as a re-sort does. */
    function Sheet({
      isOpen,
      generation,
      returnFocus,
    }: {
      isOpen: boolean;
      generation: number;
      returnFocus: () => void;
    }) {
      return (
        <>
          <button type="button" key={generation} id="card">
            Card
          </button>
          <DetailPanel
            isOpen={isOpen}
            onClose={() => undefined}
            returnFocus={returnFocus}
            isMobile
            ariaLabel="Film details"
            showExpandButton={false}
          >
            <button type="button">Favorite</button>
          </DetailPanel>
        </>
      );
    }

    const focusCard = () => document.getElementById('card')?.focus();

    it('returns focus to its opener itself while the opener is there', () => {
      const returnFocus = vi.fn(focusCard);
      const { rerender } = render(
        <Sheet isOpen={false} generation={0} returnFocus={returnFocus} />
      );
      const card = screen.getByRole('button', { name: 'Card' });
      card.focus();
      rerender(<Sheet isOpen generation={0} returnFocus={returnFocus} />);
      expect(screen.getByRole('button', { name: 'Close panel' })).toHaveFocus();

      rerender(
        <Sheet isOpen={false} generation={0} returnFocus={returnFocus} />
      );

      expect(returnFocus).not.toHaveBeenCalled();
      expect(card).toHaveFocus();
    });

    it('asks for focus back when its opener was remounted while open', () => {
      const returnFocus = vi.fn(focusCard);
      const { rerender } = render(
        <Sheet isOpen={false} generation={0} returnFocus={returnFocus} />
      );
      const before = screen.getByRole('button', { name: 'Card' });
      before.focus();
      rerender(<Sheet isOpen generation={0} returnFocus={returnFocus} />);
      // Favorite toggled inside the sheet: the card re-sorts and remounts.
      rerender(<Sheet isOpen generation={1} returnFocus={returnFocus} />);
      expect(before.isConnected).toBe(false);

      rerender(
        <Sheet isOpen={false} generation={1} returnFocus={returnFocus} />
      );

      expect(returnFocus).toHaveBeenCalledTimes(1);
      const after = screen.getByRole('button', { name: 'Card' });
      expect(after).not.toBe(before);
      expect(after).toHaveFocus();
    });
  });
});
