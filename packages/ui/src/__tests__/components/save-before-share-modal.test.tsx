import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';

describe('SaveBeforeShareModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSaveAndShare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders when open', () => {
    render(<SaveBeforeShareModal {...defaultProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<SaveBeforeShareModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<SaveBeforeShareModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape while closed', () => {
    const onClose = vi.fn();
    render(
      <SaveBeforeShareModal
        {...defaultProps}
        isOpen={false}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('clears the typed preset name when dismissed with Escape', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SaveBeforeShareModal {...defaultProps} onClose={onClose} />
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Draft name' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    rerender(
      <SaveBeforeShareModal
        {...defaultProps}
        isOpen={false}
        onClose={onClose}
      />
    );
    rerender(<SaveBeforeShareModal {...defaultProps} onClose={onClose} />);

    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('hides the backdrop from assistive technology', () => {
    render(<SaveBeforeShareModal {...defaultProps} />);

    const backdrop = document.querySelector(
      '[data-testid="save-before-share-backdrop"]'
    );
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveAttribute('tabindex', '-1');
  });
});
