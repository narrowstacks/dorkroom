import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
      const { container } = render(
        <ConfirmModal {...defaultProps} onClose={onClose} />
      );

      const backdrop = container.ownerDocument.querySelector(
        '[data-testid="confirm-modal-backdrop"]'
      );
      expect(backdrop).not.toBeNull();
      fireEvent.click(backdrop as Element);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is hidden from assistive technology and out of the tab order', () => {
      render(<ConfirmModal {...defaultProps} />);

      const backdrop = document.querySelector(
        '[data-testid="confirm-modal-backdrop"]'
      );
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
      expect(backdrop).toHaveAttribute('tabindex', '-1');
    });
  });
});
