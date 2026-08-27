import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareModal } from '../../components/share-modal';

describe('ShareModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    presetName: 'My Preset',
    webUrl: 'https://dorkroom.art/border?p=abc',
    onCopyToClipboard: vi.fn(async () => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders when open', () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByDisplayValue(/dorkroom\.art/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByDisplayValue(/dorkroom\.art/)).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape while closed', () => {
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('still dismisses when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);

    const backdrop = document.querySelector('[role="presentation"]');
    if (!backdrop) throw new Error('backdrop not found');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
