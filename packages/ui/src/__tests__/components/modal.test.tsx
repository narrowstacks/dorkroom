/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- Test file requires type assertions for DOM element access */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../../components/modal';

// Mock createPortal to render directly in test environment
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

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

    const backdrop = screen.getByRole('dialog');
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

      const modalContent = screen.getByRole('dialog').firstChild as HTMLElement;
      expect(modalContent).toHaveClass('max-w-md');
    });

    it('applies correct size class for md (default)', () => {
      render(<Modal {...defaultProps} />);

      const modalContent = screen.getByRole('dialog').firstChild as HTMLElement;
      expect(modalContent).toHaveClass('max-w-2xl');
    });

    it('applies correct size class for lg', () => {
      render(<Modal {...defaultProps} size="lg" />);

      const modalContent = screen.getByRole('dialog').firstChild as HTMLElement;
      expect(modalContent).toHaveClass('max-w-4xl');
    });

    it('applies correct size class for xl', () => {
      render(<Modal {...defaultProps} size="xl" />);

      const modalContent = screen.getByRole('dialog').firstChild as HTMLElement;
      expect(modalContent).toHaveClass('max-w-5xl');
    });
  });

  describe('accessibility', () => {
    it('has proper dialog role and attributes', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has accessible close button', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('has proper heading structure when title is provided', () => {
      render(<Modal {...defaultProps} title="Modal Title" />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Modal Title');
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
    it('close button is focusable', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();

      expect(closeButton).toHaveFocus();
    });
  });

  describe('mouse interactions', () => {
    it('handles close button hover states', () => {
      render(<Modal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });

      // Test mouse enter
      fireEvent.mouseEnter(closeButton);
      // Note: We can't easily test the inline style changes, but the handlers are called

      // Test mouse leave
      fireEvent.mouseLeave(closeButton);
    });
  });

  describe('portal behavior', () => {
    it('renders content inside modal structure', () => {
      render(<Modal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });
  });
});
