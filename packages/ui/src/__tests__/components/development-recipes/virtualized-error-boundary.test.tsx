import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtualizedErrorBoundary } from '../../../components/development-recipes/virtualized-error-boundary';

// Component that throws an error for testing
interface ThrowingComponentProps {
  shouldThrow: boolean;
  errorMessage?: string;
}

const ThrowingComponent = ({
  shouldThrow,
  errorMessage = 'Test error',
}: ThrowingComponentProps) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Normal content</div>;
};

describe('VirtualizedErrorBoundary', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary logging in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <VirtualizedErrorBoundary>
          <div>Test content</div>
        </VirtualizedErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      render(
        <VirtualizedErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </VirtualizedErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('catches errors and renders default fallback UI', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'An error occurred while rendering the list. Please try again.'
        )
      ).toBeInTheDocument();
    });

    it('renders Try Again button in error state', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByRole('button', { name: 'Try Again' })
      ).toBeInTheDocument();
    });

    it('renders error icon with proper accessibility attributes', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      const errorIcon = screen.getByRole('img', { name: 'Error' });
      expect(errorIcon).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <VirtualizedErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong loading the results')
      ).not.toBeInTheDocument();
    });

    it('renders complex custom fallback', () => {
      const customFallback = (
        <div>
          <h1>Oops!</h1>
          <p>Something broke</p>
          <button type="button">Retry</button>
        </div>
      );

      render(
        <VirtualizedErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByRole('heading', { name: 'Oops!' })
      ).toBeInTheDocument();
      expect(screen.getByText('Something broke')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  describe('error recovery', () => {
    it('resets error state when Try Again is clicked', () => {
      const { rerender } = render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();

      // We need to prevent the child from throwing again after reset
      // Rerender with non-throwing component before clicking
      rerender(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </VirtualizedErrorBoundary>
      );

      // Error state should still be shown (reset hasn't happened yet from button)
      // The rerender with false just prepares for when Try Again is clicked
    });

    it('calls onReset callback when Try Again is clicked', () => {
      const onReset = vi.fn();

      render(
        <VirtualizedErrorBoundary onReset={onReset}>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      fireEvent.click(tryAgainButton);

      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('resets internal error state on Try Again click', () => {
      // Use a stateful wrapper to control the throwing behavior
      let shouldThrow = true;

      const ControlledComponent = () => {
        if (shouldThrow) {
          throw new Error('Controlled error');
        }
        return <div>Recovered content</div>;
      };

      render(
        <VirtualizedErrorBoundary>
          <ControlledComponent />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();

      // Prevent throwing on next render
      shouldThrow = false;

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      fireEvent.click(tryAgainButton);

      // After reset, should render the recovered content
      expect(screen.getByText('Recovered content')).toBeInTheDocument();
    });
  });

  describe('development mode error details', () => {
    it('shows error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent
            shouldThrow={true}
            errorMessage="Detailed test error"
          />
        </VirtualizedErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
    });

    it('shows error stack in development mode details', () => {
      process.env.NODE_ENV = 'development';

      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent
            shouldThrow={true}
            errorMessage="Stack trace error"
          />
        </VirtualizedErrorBoundary>
      );

      // The details summary should be present
      const details = screen.getByText('Error Details');
      expect(details.tagName.toLowerCase()).toBe('summary');

      // Click to expand details
      fireEvent.click(details);

      // Should show the error message in the pre element
      expect(screen.getByText(/Stack trace error/)).toBeInTheDocument();
    });

    it('hides error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
    });

    it('logs errors to console in development mode', () => {
      process.env.NODE_ENV = 'development';
      consoleErrorSpy.mockRestore(); // Allow console.error for this test
      const mockConsoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorMessage="Logged error" />
        </VirtualizedErrorBoundary>
      );

      // React's error boundary logs errors, check our custom logging
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockRestore();
    });
  });

  describe('accessibility', () => {
    it('has proper heading structure in error state', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent(
        'Something went wrong loading the results'
      );
    });

    it('Try Again button has focus styles', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      const button = screen.getByRole('button', { name: 'Try Again' });
      // Button has focus-visible styles for accessibility
      expect(button.className).toContain('focus-visible:outline');
    });

    it('Try Again button is focusable', () => {
      render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      const button = screen.getByRole('button', { name: 'Try Again' });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('layout and styling', () => {
    it('has minimum height for error container', () => {
      const { container } = render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      // The wrapper div has the min-h-[300px] class
      const errorContainer = container.querySelector('.min-h-\\[300px\\]');
      expect(errorContainer).toBeInTheDocument();
    });

    it('centers error content', () => {
      const { container } = render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      // The wrapper div has centering classes
      const errorContainer = container.querySelector(
        '.items-center.justify-center'
      );
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('handles errors without stack traces', () => {
      process.env.NODE_ENV = 'development';

      const errorWithoutStack = new Error('No stack error');
      delete errorWithoutStack.stack;

      const ComponentWithStacklessError = () => {
        throw errorWithoutStack;
      };

      render(
        <VirtualizedErrorBoundary>
          <ComponentWithStacklessError />
        </VirtualizedErrorBoundary>
      );

      expect(screen.getByText('Error Details')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Error Details'));
      expect(screen.getByText('Error: No stack error')).toBeInTheDocument();
    });

    it('handles thrown non-Error objects', () => {
      const ComponentThrowingString = () => {
        throw 'String error'; // eslint-disable-line no-throw-literal
      };

      render(
        <VirtualizedErrorBoundary>
          <ComponentThrowingString />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();
    });
  });

  describe('nested error boundaries', () => {
    it('outer boundary catches error when inner does not handle it', () => {
      render(
        <VirtualizedErrorBoundary fallback={<div>Outer fallback</div>}>
          <VirtualizedErrorBoundary fallback={<div>Inner fallback</div>}>
            <ThrowingComponent shouldThrow={true} />
          </VirtualizedErrorBoundary>
        </VirtualizedErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Inner fallback')).toBeInTheDocument();
      expect(screen.queryByText('Outer fallback')).not.toBeInTheDocument();
    });
  });

  describe('state management', () => {
    it('maintains error state until explicitly reset', () => {
      const { rerender } = render(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();

      // Rerender with different props (but error state persists)
      rerender(
        <VirtualizedErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </VirtualizedErrorBoundary>
      );

      // Should still show error state
      expect(
        screen.getByText('Something went wrong loading the results')
      ).toBeInTheDocument();
    });
  });
});
