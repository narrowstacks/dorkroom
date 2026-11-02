import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../../components/confirm-modal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Recipe',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('renders the title and message when open', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Delete Recipe')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Delete Recipe')).not.toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape while closed', () => {
    const onClose = vi.fn();
    render(<ConfirmModal {...defaultProps} isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not confirm on Escape', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  describe('backdrop', () => {
    it('dismisses on click', () => {
      const onClose = vi.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('modal-backdrop'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is hidden from assistive technology and out of the tab order', () => {
      render(<ConfirmModal {...defaultProps} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
      expect(backdrop).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('confirm button colours', () => {
    it('takes its foreground from a theme token, not a raw colour', () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirm = screen.getByRole('button', { name: 'Confirm' });
      expect(confirm).toHaveClass('text-background');
    });

    it('fills with the primary token for a non-destructive action', () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirm = screen.getByRole('button', { name: 'Confirm' });
      expect(confirm).toHaveClass('bg-brand');
    });

    it('fills with the error token for a destructive action', () => {
      render(<ConfirmModal {...defaultProps} isDestructive={true} />);

      const confirm = screen.getByRole('button', { name: 'Confirm' });
      expect(confirm).toHaveClass('bg-error');
      expect(confirm).toHaveClass('text-background');
    });
  });
});

describe('ConfirmModal returnFocus (#604)', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  /** A Delete button that opens the confirm; a confirmed delete removes it. */
  function DeleteFlow() {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    return (
      <>
        <div ref={listRef} tabIndex={-1} data-testid="list">
          {!isDeleted && (
            <button type="button" onClick={() => setIsOpen(true)}>
              Delete
            </button>
          )}
        </div>
        <ConfirmModal
          isOpen={isOpen}
          onClose={() => {
            returnFocusRef.current = null;
            setIsOpen(false);
          }}
          onConfirm={() => {
            returnFocusRef.current = listRef.current;
            setIsDeleted(true);
            setIsOpen(false);
          }}
          title="Delete Recipe"
          message="Are you sure?"
          confirmText="Delete"
          returnFocus={returnFocusRef}
        />
      </>
    );
  }

  const openConfirm = () => {
    const opener = screen.getByRole('button', { name: 'Delete' });
    opener.focus();
    fireEvent.click(opener);
    return opener;
  };

  it('sends focus to the returnFocus target after a confirmed delete', () => {
    render(<DeleteFlow />);
    openConfirm();

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      })
    );

    expect(document.activeElement).toBe(screen.getByTestId('list'));
  });

  it('returns focus to the opener on cancel', () => {
    render(<DeleteFlow />);
    const opener = openConfirm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(document.activeElement).toBe(opener);
  });
});
