import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from '../../components/drawer';

// Mock timers for testing animations
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Wrap in act() to prevent "not wrapped in act()" warnings
  // from state updates triggered by pending timers (e.g. Drawer visibility timeout)
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  cleanup();
  // Reset body overflow
  document.body.style.overflow = 'unset';
});

describe('Drawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Drawer content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = 'unset';
  });

  it('renders when isOpen is true', () => {
    render(<Drawer {...defaultProps} />);

    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Drawer {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Drawer {...defaultProps} onClose={onClose} />);

    // Find and click the backdrop
    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  describe('anchoring', () => {
    it('applies bottom anchor classes by default', () => {
      render(<Drawer {...defaultProps} />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('bottom-0', 'left-0', 'right-0');
    });

    it('applies top anchor classes', () => {
      render(<Drawer {...defaultProps} anchor="top" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('top-0', 'left-0', 'right-0');
    });

    it('applies left anchor classes', () => {
      render(<Drawer {...defaultProps} anchor="left" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('left-0', 'top-0', 'bottom-0');
    });

    it('applies right anchor classes', () => {
      render(<Drawer {...defaultProps} anchor="right" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('right-0', 'top-0', 'bottom-0');
    });
  });

  describe('sizes', () => {
    it('applies small size class', () => {
      render(<Drawer {...defaultProps} size="sm" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('max-h-[40dvh]');
    });

    it('applies medium size class by default', () => {
      render(<Drawer {...defaultProps} />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('max-h-[60dvh]');
    });

    it('applies large size class', () => {
      render(<Drawer {...defaultProps} size="lg" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('max-h-[80dvh]');
    });

    it('merges custom class names onto the drawer container', () => {
      render(
        <Drawer
          {...defaultProps}
          className="max-h-[95dvh] custom-drawer-class"
        />
      );

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('custom-drawer-class');
      expect(drawer).toHaveClass('max-h-[95dvh]');
      expect(drawer).not.toHaveClass('max-h-[60dvh]');
    });

    it('applies width for side anchors', () => {
      render(<Drawer {...defaultProps} anchor="left" />);

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('w-80', 'h-full');
    });
  });

  describe('background options', () => {
    it('applies background blur when enabled', () => {
      render(<Drawer {...defaultProps} enableBackgroundBlur={true} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('backdrop-blur-sm');
    });

    it('does not apply background blur by default', () => {
      render(<Drawer {...defaultProps} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).not.toHaveClass('backdrop-blur-sm');
    });

    it('paints the overlay with the theme overlay token by default', () => {
      render(<Drawer {...defaultProps} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass(
        'bg-[color:var(--color-visualization-overlay)]'
      );
    });

    it('does not apply background overlay when disabled', () => {
      render(<Drawer {...defaultProps} enableBackgroundOverlay={false} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).not.toHaveClass(
        'bg-[color:var(--color-visualization-overlay)]'
      );
    });
  });

  describe('animation and visibility', () => {
    it('applies transform classes based on open state', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

      // Flush the requestAnimationFrame used for the open animation
      act(() => {
        vi.advanceTimersByTime(16);
      });

      let drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('translate-y-0');

      rerender(<Drawer {...defaultProps} isOpen={false} />);
      drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('translate-y-full');
    });

    it('manages visibility state with delay when closing', async () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

      expect(screen.getByText('Drawer content')).toBeInTheDocument();

      rerender(<Drawer {...defaultProps} isOpen={false} />);

      // Should still be visible immediately
      expect(screen.getByText('Drawer content')).toBeInTheDocument();

      // After 300ms delay, should be hidden
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
    });

    it('slides the top-anchored drawer in on open and out on close', () => {
      const { rerender } = render(
        <Drawer {...defaultProps} anchor="top" isOpen={true} />
      );

      // Flush the requestAnimationFrame used for the open animation
      act(() => {
        vi.advanceTimersByTime(16);
      });

      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('translate-y-0');
      expect(drawer).not.toHaveClass('-translate-y-full');

      rerender(<Drawer {...defaultProps} anchor="top" isOpen={false} />);
      expect(drawer).toHaveClass('-translate-y-full');
      expect(drawer).not.toHaveClass('translate-y-0');
    });
  });

  describe('body overflow management', () => {
    it('sets body overflow to hidden when drawer opens', () => {
      render(<Drawer {...defaultProps} isOpen={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('resets body overflow when drawer closes', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<Drawer {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('backdrop opacity animation', () => {
    it('applies opacity classes based on open state', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

      // Flush the requestAnimationFrame used for the open animation
      act(() => {
        vi.advanceTimersByTime(16);
      });

      let backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('opacity-100');

      rerender(<Drawer {...defaultProps} isOpen={false} />);
      backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('opacity-0');
    });
  });

  describe('escape key', () => {
    it('calls onClose when Escape is pressed while open', () => {
      const onClose = vi.fn();
      render(<Drawer {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape while closed', () => {
      const onClose = vi.fn();
      render(<Drawer {...defaultProps} isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('stops listening once the drawer is closed, even mid-animation', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <Drawer {...defaultProps} onClose={onClose} />
      );

      rerender(<Drawer {...defaultProps} isOpen={false} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
