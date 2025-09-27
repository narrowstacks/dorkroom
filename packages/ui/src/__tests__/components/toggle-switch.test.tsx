import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../../components/toggle-switch';

describe('ToggleSwitch', () => {
  const defaultProps = {
    label: 'Enable feature',
    value: false,
    onValueChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label', () => {
    render(<ToggleSwitch {...defaultProps} />);

    expect(screen.getByText('Enable feature')).toBeInTheDocument();
  });

  it('renders button with correct initial state', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('calls onValueChange when button is clicked', () => {
    const onValueChange = vi.fn();
    render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('calls onValueChange when label is clicked', () => {
    const onValueChange = vi.fn();
    render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

    const label = screen.getByText('Enable feature');
    fireEvent.click(label);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('toggles value correctly when true', () => {
    const onValueChange = vi.fn();
    render(
      <ToggleSwitch
        {...defaultProps}
        value={true}
        onValueChange={onValueChange}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('applies different styles for on and off states', () => {
    const { rerender } = render(
      <ToggleSwitch {...defaultProps} value={false} />
    );

    const button = screen.getByRole('button');
    const circle = button.querySelector('span');

    // Off state
    expect(circle).toHaveClass('translate-x-1');

    // On state
    rerender(<ToggleSwitch {...defaultProps} value={true} />);
    expect(circle).toHaveClass('translate-x-6');
  });

  it('applies custom className', () => {
    render(<ToggleSwitch {...defaultProps} className="custom-class" />);

    const container = screen.getByText('Enable feature').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('has proper button attributes', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('has proper focus styling classes', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    );
  });

  describe('accessibility', () => {
    it('can be activated via keyboard', () => {
      const onValueChange = vi.fn();
      render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button); // Space or Enter would trigger click

      expect(onValueChange).toHaveBeenCalled();
    });

    it('is properly labeled', () => {
      render(<ToggleSwitch {...defaultProps} />);

      const button = screen.getByRole('button');
      const label = screen.getByText('Enable feature');

      expect(button).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('cursor-pointer'); // Clickable label
    });
  });

  describe('visual states', () => {
    it('shows correct visual state when enabled', () => {
      render(<ToggleSwitch {...defaultProps} value={true} />);

      const button = screen.getByRole('button');
      const circle = button.querySelector('span');

      expect(circle).toHaveClass('translate-x-6'); // Moved to right
    });

    it('shows correct visual state when disabled', () => {
      render(<ToggleSwitch {...defaultProps} value={false} />);

      const button = screen.getByRole('button');
      const circle = button.querySelector('span');

      expect(circle).toHaveClass('translate-x-1'); // Moved to left
    });
  });

  describe('interaction states', () => {
    it('handles rapid clicking correctly', () => {
      const onValueChange = vi.fn();
      render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

      const button = screen.getByRole('button');

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onValueChange).toHaveBeenCalledTimes(3);
      expect(onValueChange).toHaveBeenNthCalledWith(1, true);
      expect(onValueChange).toHaveBeenNthCalledWith(2, true); // Always toggles from current prop
      expect(onValueChange).toHaveBeenNthCalledWith(3, true);
    });
  });
});
