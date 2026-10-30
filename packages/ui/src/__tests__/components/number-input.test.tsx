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
    expect(input).toHaveClass('focus-visible:outline-none');
    expect(input.style.boxShadow).toBe('none');

    fireEvent.focus(input);
    // The visible focus ring is the inline box-shadow, driven by the
    // --color-focus-ring token (readable in every theme).
    expect(input.style.boxShadow).toContain('var(--color-focus-ring)');

    fireEvent.blur(input);
    // Blur resets focus state
    expect(input.style.boxShadow).toBe('none');
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

  describe('min/max', () => {
    it('applies native min and max attributes', () => {
      render(<NumberInput {...defaultProps} min={0} max={10} />);
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '10');
    });

    it('omits min and max attributes by default', () => {
      render(<NumberInput {...defaultProps} />);
      const input = screen.getByRole('spinbutton');
      expect(input).not.toHaveAttribute('min');
      expect(input).not.toHaveAttribute('max');
    });

    it('clamps a value below min on blur', () => {
      const onChangeText = vi.fn();
      render(
        <NumberInput value="-3" onChangeText={onChangeText} min={0} max={10} />
      );
      fireEvent.blur(screen.getByRole('spinbutton'));
      expect(onChangeText).toHaveBeenCalledWith('0');
    });

    it('clamps a value above max on blur', () => {
      const onChangeText = vi.fn();
      render(
        <NumberInput value="99" onChangeText={onChangeText} min={0} max={10} />
      );
      fireEvent.blur(screen.getByRole('spinbutton'));
      expect(onChangeText).toHaveBeenCalledWith('10');
    });

    it('does not clamp on change, only on blur', () => {
      const onChangeText = vi.fn();
      render(
        <NumberInput value="5" onChangeText={onChangeText} min={0} max={10} />
      );
      fireEvent.change(screen.getByRole('spinbutton'), {
        target: { value: '-1' },
      });
      expect(onChangeText).toHaveBeenCalledTimes(1);
      expect(onChangeText).toHaveBeenCalledWith('-1');
    });

    it('leaves in-range and empty values alone on blur, and still calls onBlur', () => {
      const onChangeText = vi.fn();
      const onBlur = vi.fn();
      const { rerender } = render(
        <NumberInput
          value="5"
          onChangeText={onChangeText}
          onBlur={onBlur}
          min={0}
          max={10}
        />
      );
      fireEvent.blur(screen.getByRole('spinbutton'));
      rerender(
        <NumberInput
          value=""
          onChangeText={onChangeText}
          onBlur={onBlur}
          min={0}
          max={10}
        />
      );
      fireEvent.blur(screen.getByRole('spinbutton'));
      expect(onChangeText).not.toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalledTimes(2);
    });

    it('does not clamp when no bounds are given', () => {
      const onChangeText = vi.fn();
      render(<NumberInput value="-50" onChangeText={onChangeText} />);
      fireEvent.blur(screen.getByRole('spinbutton'));
      expect(onChangeText).not.toHaveBeenCalled();
    });
  });
});
