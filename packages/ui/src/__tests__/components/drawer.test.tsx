import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { act } from 'react';
import { Drawer, DrawerContent, DrawerBody } from '../../components/drawer';

// Mock timers for testing animations
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
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

    it('applies background overlay by default', () => {
      render(<Drawer {...defaultProps} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('bg-black/50');
    });

    it('does not apply background overlay when disabled', () => {
      render(<Drawer {...defaultProps} enableBackgroundOverlay={false} />);

      const backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).not.toHaveClass('bg-black/50');
    });
  });

  describe('animation and visibility', () => {
    it('applies transform classes based on open state', () => {
      const { rerender } = render(<Drawer {...defaultProps} isOpen={true} />);

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

    it('applies correct transform for different anchors when closed', () => {
      const { rerender } = render(
        <Drawer {...defaultProps} anchor="top" isOpen={true} />
      );

      rerender(<Drawer {...defaultProps} anchor="top" isOpen={false} />);
      const drawer = document.querySelector('.absolute.border');
      expect(drawer).toHaveClass('-translate-y-full');
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

      let backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('opacity-100');

      rerender(<Drawer {...defaultProps} isOpen={false} />);
      backdrop = document.querySelector('.absolute.inset-0');
      expect(backdrop).toHaveClass('opacity-0');
    });
  });
});

describe('DrawerContent', () => {
  it('renders children with default classes', () => {
    render(
      <DrawerContent>
        <div>Content</div>
      </DrawerContent>
    );

    const content = screen.getByText('Content').parentElement;
    expect(content).toHaveClass('h-full', 'flex', 'flex-col');
  });

  it('applies custom className', () => {
    render(
      <DrawerContent className="custom-class">
        <div>Content</div>
      </DrawerContent>
    );

    const content = screen.getByText('Content').parentElement;
    expect(content).toHaveClass('custom-class');
  });
});

describe('DrawerBody', () => {
  it('renders children with default classes', () => {
    render(
      <DrawerBody>
        <div>Body content</div>
      </DrawerBody>
    );

    const body = screen.getByText('Body content').parentElement;
    expect(body).toHaveClass('flex-1', 'overflow-y-auto');
  });

  it('applies custom className', () => {
    render(
      <DrawerBody className="custom-body-class">
        <div>Body content</div>
      </DrawerBody>
    );

    const body = screen.getByText('Body content').parentElement;
    expect(body).toHaveClass('custom-body-class');
  });
});

describe('Drawer integration', () => {
  it('works together with DrawerContent and DrawerBody', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <DrawerContent>
          <DrawerBody>
            <div>Integrated content</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );

    expect(screen.getByText('Integrated content')).toBeInTheDocument();
  });
});
