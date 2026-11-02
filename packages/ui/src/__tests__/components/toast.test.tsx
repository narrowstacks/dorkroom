import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast, ToastProvider } from '../../components/toast';
import { useOptionalToast, useToast } from '../../components/toast-context';

// Mock timers for testing animations and auto-dismiss
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Wrap in act() to prevent "not wrapped in act()" warnings
  // from state updates triggered by pending timers (e.g. Toast animation timeout)
  act(() => {
    vi.runOnlyPendingTimers();
  });
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

  it('renders the success check icon and border by default', () => {
    render(<Toast {...defaultProps} />);

    const toastElement = screen.getByTestId('toast');
    expect(toastElement.querySelector('svg')).toHaveClass('lucide-check');
    expect(toastElement.querySelector('.lucide-x')).not.toBeInTheDocument();
    expect(toastElement.style.borderColor).toBe(
      'var(--color-semantic-success)'
    );
  });

  it('renders the error X icon and border for error type', () => {
    render(<Toast {...defaultProps} type="error" />);

    const toastElement = screen.getByTestId('toast');
    expect(toastElement.querySelector('svg')).toHaveClass('lucide-x');
    expect(toastElement.querySelector('.lucide-check')).not.toBeInTheDocument();
    expect(toastElement.style.borderColor).toBe('var(--color-semantic-error)');
  });

  it('renders no icon for info type', () => {
    render(<Toast {...defaultProps} type="info" />);

    const toastElement = screen.getByTestId('toast');
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

    const toast = screen.getByTestId('toast');
    expect(toast).not.toHaveAttribute('aria-live');
    expect(toast).not.toHaveAttribute('role');
  });

  describe('animation classes', () => {
    it('applies animation classes when visible', () => {
      render(<Toast {...defaultProps} isVisible={true} />);

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('translate-x-0', 'opacity-100');
    });
  });
});

describe('ToastProvider', () => {
  const TestComponent = () => {
    const { showToast } = useToast();

    return (
      <button type="button" onClick={() => showToast('Test toast', 'success')}>
        Show Toast
      </button>
    );
  };

  it('shows toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Toast');
    fireEvent.click(button);
    expect(screen.getByTestId('toast')).toHaveTextContent('Test toast');
  });

  it('uses default success type when type not specified', async () => {
    const TestComponentDefault = () => {
      const { showToast } = useToast();
      return (
        <button type="button" onClick={() => showToast('Default toast')}>
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

    const toastElement = screen.getByTestId('toast');
    expect(toastElement).toHaveTextContent('Default toast');
    expect(toastElement.querySelector('svg')).toHaveClass('lucide-check');
    expect(toastElement.style.borderColor).toBe(
      'var(--color-semantic-success)'
    );
  });

  it('replaces previous toast with new one', async () => {
    const TestMultiple = () => {
      const { showToast } = useToast();
      return (
        <>
          <button type="button" onClick={() => showToast('First toast')}>
            First Toast
          </button>
          <button type="button" onClick={() => showToast('Second toast')}>
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
    expect(screen.getByTestId('toast')).toHaveTextContent('First toast');

    const secondButton = screen.getByText('Second Toast');
    fireEvent.click(secondButton);
    expect(screen.getByTestId('toast')).toHaveTextContent('Second toast');
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
    expect(screen.getByTestId('toast')).toBeInTheDocument();

    // Auto-dismiss after duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
  });
});

describe('ToastProvider live regions', () => {
  const regions = () =>
    Array.from(document.body.querySelectorAll('[data-toast-live-region]'));
  const polite = () =>
    document.body.querySelector('[data-toast-live-region="polite"]');
  const assertive = () =>
    document.body.querySelector('[data-toast-live-region="assertive"]');

  const Trigger = ({ type }: { type?: 'error' }) => {
    const { showToast } = useToast();
    return (
      <button type="button" onClick={() => showToast('Link copied', type)}>
        Go
      </button>
    );
  };

  it('mounts the regions as body children before any toast, empty', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(regions()).toHaveLength(2);
    for (const region of regions()) {
      expect(region.parentElement).toBe(document.body);
      expect(region).toBeEmptyDOMElement();
    }
    expect(polite()).toHaveAttribute('aria-live', 'polite');
    expect(polite()).toHaveAttribute('aria-atomic', 'true');
    expect(assertive()).toHaveAttribute('aria-live', 'assertive');
  });

  it('puts the message in the persistent region without duplicating it', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    const before = polite();
    fireEvent.click(screen.getByText('Go'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(polite()).toBe(before);
    expect(polite()).toHaveTextContent('Link copied');
    expect(regions()).toHaveLength(2);
    expect(screen.getAllByText('Link copied')).toHaveLength(2);
  });

  it('announces an identical message again by clearing it first', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Go'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(polite()).toHaveTextContent('Link copied');
    fireEvent.click(screen.getByText('Go'));
    expect(polite()).toBeEmptyDOMElement();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(polite()).toHaveTextContent('Link copied');
  });

  it('routes error toasts to the assertive region', () => {
    render(
      <ToastProvider>
        <Trigger type="error" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Go'));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(assertive()).toHaveTextContent('Link copied');
    expect(polite()).toBeEmptyDOMElement();
  });

  it('removes the regions on unmount', () => {
    const { unmount } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    unmount();
    expect(regions()).toHaveLength(0);
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
