import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../../components/modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    // Cleanup body overflow style
    document.body.style.overflow = '';
  });

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders with title when provided', () => {
    render(<Modal {...defaultProps} title="Test Modal" />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Test Modal'
    );
  });

  it('renders close button by default', () => {
    render(<Modal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when hideCloseButton is true', () => {
    render(<Modal {...defaultProps} hideCloseButton={true} />);

    expect(
      screen.queryByRole('button', { name: 'Close' })
    ).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    const content = screen.getByText('Modal content');
    fireEvent.click(content);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders footer when provided', () => {
    const footer = <button type="button">Footer Button</button>;
    render(<Modal {...defaultProps} footer={footer} />);

    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  describe('size variants', () => {
    it('applies correct size class for sm', () => {
      render(<Modal {...defaultProps} size="sm" />);

      expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
    });

    it('applies correct size class for md (default)', () => {
      render(<Modal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl');
    });

    it('applies correct size class for lg', () => {
      render(<Modal {...defaultProps} size="lg" />);

      expect(screen.getByRole('dialog')).toHaveClass('max-w-4xl');
    });

    it('applies correct size class for xl', () => {
      render(<Modal {...defaultProps} size="xl" />);

      expect(screen.getByRole('dialog')).toHaveClass('max-w-5xl');
    });
  });

  describe('accessibility', () => {
    it('has proper dialog role and attributes', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('body overflow management', () => {
    it('sets body overflow to hidden when modal opens', () => {
      document.body.style.overflow = 'auto';

      render(<Modal {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores original body overflow when modal closes', () => {
      document.body.style.overflow = 'scroll';

      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('scroll');
    });

    it('handles empty original overflow', () => {
      document.body.style.overflow = '';

      const { rerender } = render(<Modal {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Modal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('keyboard interactions', () => {
    it('calls onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape while closed', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('focus', () => {
    const body = (
      <>
        <button type="button">First</button>
        <button type="button" hidden>
          Hidden
        </button>
        <button type="button">Last</button>
      </>
    );

    it('keeps Tab inside the dialog, wrapping at both ends', () => {
      render(
        <Modal {...defaultProps} hideCloseButton>
          {body}
        </Modal>
      );
      const first = screen.getByRole('button', { name: 'First' });
      const last = screen.getByRole('button', { name: 'Last' });

      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(first).toHaveFocus();

      fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
      expect(last).toHaveFocus();

      // Between the ends, Tab is the browser's to move.
      first.focus();
      fireEvent.keyDown(first, { key: 'Tab' });
      expect(first).toHaveFocus();
    });

    it('returns focus to the element that opened it, on close and on unmount', () => {
      const opener = document.createElement('button');
      document.body.append(opener);
      opener.focus();

      const { rerender, unmount } = render(
        <Modal {...defaultProps}>{body}</Modal>
      );
      screen.getByRole('button', { name: 'First' }).focus();
      rerender(
        <Modal {...defaultProps} isOpen={false}>
          {body}
        </Modal>
      );
      expect(opener).toHaveFocus();

      rerender(<Modal {...defaultProps}>{body}</Modal>);
      screen.getByRole('button', { name: 'Last' }).focus();
      unmount();
      expect(opener).toHaveFocus();
      opener.remove();
    });
  });
});
