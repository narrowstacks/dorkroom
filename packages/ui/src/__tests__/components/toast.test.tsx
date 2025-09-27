import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  Toast,
  ToastProvider,
  useToast,
  useOptionalToast,
} from '../../components/toast';

// Mock timers for testing animations and auto-dismiss
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('Toast', () => {
  const defaultProps = {
    message: 'Test message',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with message', () => {
    render(<Toast {...defaultProps} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders success icon by default', () => {
    render(<Toast {...defaultProps} />);

    // Check icon is rendered (Lucide Check component)
    const toastElement = screen.getByRole('status');
    expect(toastElement.querySelector('svg')).toBeInTheDocument();
  });

  it('renders error icon for error type', () => {
    render(<Toast {...defaultProps} type="error" />);

    const toastElement = screen.getByRole('status');
    expect(toastElement.querySelector('svg')).toBeInTheDocument();
  });

  it('renders no icon for info type', () => {
    render(<Toast {...defaultProps} type="info" />);

    const toastElement = screen.getByRole('status');
    // Info type should not render an icon
    expect(toastElement.querySelector('svg')).not.toBeInTheDocument();
  });

  it('auto-dismisses after duration', async () => {
    const onClose = vi.fn();
    render(<Toast {...defaultProps} duration={1000} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // No extra delay required; onClose is called in the same tick
    expect(onClose).toHaveBeenCalled();
  });

  it('uses default duration when not specified', async () => {
    const onClose = vi.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isVisible is false', () => {
    render(<Toast {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Toast {...defaultProps} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('applies correct styling classes', () => {
    render(<Toast {...defaultProps} />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
  });

  describe('animation classes', () => {
    it('applies animation classes when visible', () => {
      render(<Toast {...defaultProps} isVisible={true} />);

      const toast = screen.getByRole('status');
      expect(toast).toHaveClass('translate-x-0', 'opacity-100');
    });
  });
});

describe('ToastProvider', () => {
  const TestComponent = () => {
    const { showToast } = useToast();

    return (
      <button onClick={() => showToast('Test toast', 'success')}>
        Show Toast
      </button>
    );
  };

  it('provides toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Toast')).toBeInTheDocument();
  });

  it('shows toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Toast');
    fireEvent.click(button);
    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('uses default success type when type not specified', async () => {
    const TestComponentDefault = () => {
      const { showToast } = useToast();
      return (
        <button onClick={() => showToast('Default toast')}>
          Show Default Toast
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponentDefault />
      </ToastProvider>
    );

    const button = screen.getByText('Show Default Toast');
    fireEvent.click(button);
    expect(screen.getByText('Default toast')).toBeInTheDocument();
  });

  it('replaces previous toast with new one', async () => {
    const TestMultiple = () => {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast('First toast')}>First Toast</button>
          <button onClick={() => showToast('Second toast')}>
            Second Toast
          </button>
        </>
      );
    };

    render(
      <ToastProvider>
        <TestMultiple />
      </ToastProvider>
    );

    const firstButton = screen.getByText('First Toast');
    fireEvent.click(firstButton);
    expect(screen.getByText('First toast')).toBeInTheDocument();

    const secondButton = screen.getByText('Second Toast');
    fireEvent.click(secondButton);
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.queryByText('First toast')).not.toBeInTheDocument();
  });

  it('hides toast when onClose is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Toast');
    fireEvent.click(button);
    expect(screen.getByText('Test toast')).toBeInTheDocument();

    // Auto-dismiss after duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
  });
});

describe('useToast hook', () => {
  it('throws error when used outside ToastProvider', () => {
    const TestComponentOutside = () => {
      useToast(); // This should throw
      return <div>Test</div>;
    };

    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console errors for this test
    });

    expect(() => {
      render(<TestComponentOutside />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});

describe('useOptionalToast hook', () => {
  it('returns null when used outside ToastProvider', () => {
    const TestOptional = () => {
      const toast = useOptionalToast();
      return <div>{toast ? 'Has context' : 'No context'}</div>;
    };

    render(<TestOptional />);

    expect(screen.getByText('No context')).toBeInTheDocument();
  });

  it('returns context when used inside ToastProvider', () => {
    const TestOptional = () => {
      const toast = useOptionalToast();
      return <div>{toast ? 'Has context' : 'No context'}</div>;
    };

    render(
      <ToastProvider>
        <TestOptional />
      </ToastProvider>
    );

    expect(screen.getByText('Has context')).toBeInTheDocument();
  });
});
