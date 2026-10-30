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
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    // type="button" keeps the switch from submitting an enclosing form
    expect(toggle).toHaveAttribute('type', 'button');
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
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(circle).toHaveClass('translate-x-6');
  });

  describe('accessibility', () => {
    it('is properly labeled', () => {
      render(<ToggleSwitch {...defaultProps} />);

      const toggle = screen.getByRole('switch');
      const label = screen.getByText('Enable feature');

      expect(toggle).toHaveAttribute('aria-label', 'Enable feature');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('cursor-pointer'); // Clickable label
    });
  });
});
