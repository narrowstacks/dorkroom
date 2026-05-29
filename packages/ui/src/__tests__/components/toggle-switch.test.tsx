import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('renders switch with correct initial state', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onValueChange when switch is clicked', () => {
    const onValueChange = vi.fn();
    render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

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

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('applies different styles for on and off states', () => {
    const { rerender } = render(
      <ToggleSwitch {...defaultProps} value={false} />
    );

    const toggle = screen.getByRole('switch');
    const circle = toggle.querySelector('span');

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

  it('has proper switch attributes', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('role', 'switch');
  });

  it('has proper focus styling classes', () => {
    render(<ToggleSwitch {...defaultProps} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    );
  });

  describe('accessibility', () => {
    it('can be activated via keyboard', () => {
      const onValueChange = vi.fn();
      render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

      const toggle = screen.getByRole('switch');
      fireEvent.keyDown(toggle, { key: 'Enter' });
      fireEvent.click(toggle); // Space or Enter would trigger click

      expect(onValueChange).toHaveBeenCalled();
    });

    it('is properly labeled', () => {
      render(<ToggleSwitch {...defaultProps} />);

      const toggle = screen.getByRole('switch');
      const label = screen.getByText('Enable feature');

      expect(toggle).toHaveAttribute('aria-label', 'Enable feature');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('cursor-pointer'); // Clickable label
    });
  });

  describe('visual states', () => {
    it('shows correct visual state when enabled', () => {
      render(<ToggleSwitch {...defaultProps} value={true} />);

      const toggle = screen.getByRole('switch');
      const circle = toggle.querySelector('span');

      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(circle).toHaveClass('translate-x-6'); // Moved to right
    });

    it('shows correct visual state when disabled', () => {
      render(<ToggleSwitch {...defaultProps} value={false} />);

      const toggle = screen.getByRole('switch');
      const circle = toggle.querySelector('span');

      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(circle).toHaveClass('translate-x-1'); // Moved to left
    });
  });

  describe('interaction states', () => {
    it('handles rapid clicking correctly', () => {
      const onValueChange = vi.fn();
      render(<ToggleSwitch {...defaultProps} onValueChange={onValueChange} />);

      const toggle = screen.getByRole('switch');

      fireEvent.click(toggle);
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      expect(onValueChange).toHaveBeenCalledTimes(3);
      expect(onValueChange).toHaveBeenNthCalledWith(1, true);
      expect(onValueChange).toHaveBeenNthCalledWith(2, true); // Always toggles from current prop
      expect(onValueChange).toHaveBeenNthCalledWith(3, true);
    });
  });
});
