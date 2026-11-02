import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DetailPanel } from '../../components/detail-panel/detail-panel';

/**
 * The desktop sidebar is not modal, so it has no opener to return focus to.
 * Closing it with focus inside asks the page to put focus back (#604).
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

  it('leaves the mobile sheet to return focus itself', () => {
    const { returnFocus, onClose } = renderPanel(true);

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

    expect(returnFocus).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
