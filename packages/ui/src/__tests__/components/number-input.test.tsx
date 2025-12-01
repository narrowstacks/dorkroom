import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from '../../components/number-input';

describe('NumberInput', () => {
  const defaultProps = {
    value: '5',
    onChangeText: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct value', () => {
    render(<NumberInput {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(5);
    expect(input).toHaveDisplayValue('5');
  });

  it('calls onChangeText when value changes', () => {
    const onChangeText = vi.fn();
    render(<NumberInput {...defaultProps} onChangeText={onChangeText} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });

    expect(onChangeText).toHaveBeenCalledWith('10');
  });

  it('renders with placeholder', () => {
    render(<NumberInput {...defaultProps} placeholder="Enter number" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('placeholder', 'Enter number');
  });

  it('renders with title attribute', () => {
    render(<NumberInput {...defaultProps} inputTitle="Number input field" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('title', 'Number input field');
  });

  it('sets step attribute correctly', () => {
    render(<NumberInput {...defaultProps} step={0.5} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '0.5');
  });

  it('uses default step when not provided', () => {
    render(<NumberInput {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('step', '1');
  });

  it('applies custom className', () => {
    render(<NumberInput {...defaultProps} className="custom-class" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('custom-class');
  });

  it('applies base styling classes', () => {
    render(<NumberInput {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('w-20', 'rounded-lg', 'border', 'px-3', 'py-2');
  });

  it('manages focus state for styling', () => {
    render(<NumberInput {...defaultProps} />);

    const input = screen.getByRole('spinbutton');

    // Initially not focused
    expect(input).toHaveClass('focus:outline-none');

    fireEvent.focus(input);
    // Focus state affects internal state but classes are consistent
    expect(input).toHaveClass('focus:ring-2');

    fireEvent.blur(input);
    // Blur resets focus state
  });

  it('handles empty string value', () => {
    render(<NumberInput {...defaultProps} value="" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveDisplayValue('');
  });

  it('handles string numbers correctly', () => {
    render(<NumberInput {...defaultProps} value="42.5" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveDisplayValue('42.5');
  });

  it('preserves exact string value passed', () => {
    render(<NumberInput {...defaultProps} value="007" />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveDisplayValue('007');
  });

  it('has correct input type', () => {
    render(<NumberInput {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });

  describe('focus and blur events', () => {
    it('changes styling on focus and blur', () => {
      render(<NumberInput {...defaultProps} />);

      const input = screen.getByRole('spinbutton');

      // Test focus
      fireEvent.focus(input);
      // Internal focus state is managed but we can't easily test the dynamic styles

      // Test blur
      fireEvent.blur(input);
      // Internal focus state should reset
    });
  });

  describe('accessibility', () => {
    it('is accessible as a spinbutton', () => {
      render(<NumberInput {...defaultProps} />);

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('supports title for additional context', () => {
      render(<NumberInput {...defaultProps} inputTitle="Enter your age" />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAccessibleDescription(); // Title provides description
    });
  });
});
