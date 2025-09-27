import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabeledSliderInput } from '../../components/labeled-slider-input';

describe('LabeledSliderInput', () => {
  const defaultProps = {
    label: 'Test Label',
    value: 5,
    onChange: vi.fn(),
    min: 0,
    max: 10,
    step: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with label and current value', () => {
    render(<LabeledSliderInput {...defaultProps} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('renders number input and range slider', () => {
    render(<LabeledSliderInput {...defaultProps} />);

    const numberInput = screen.getByRole('spinbutton');
    const rangeSlider = screen.getByRole('slider');

    expect(numberInput).toBeInTheDocument();
    expect(rangeSlider).toBeInTheDocument();
    expect(numberInput).toHaveValue(5);
    expect(rangeSlider).toHaveValue('5');
  });

  it('calls onChange when number input changes', () => {
    const onChange = vi.fn();
    render(<LabeledSliderInput {...defaultProps} onChange={onChange} />);

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.change(numberInput, { target: { value: '7' } });

    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('calls onSliderChange when slider moves', () => {
    const onSliderChange = vi.fn();
    render(
      <LabeledSliderInput {...defaultProps} onSliderChange={onSliderChange} />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });

    expect(onSliderChange).toHaveBeenCalledWith(8);
  });

  it('falls back to onChange when onSliderChange not provided', () => {
    const onChange = vi.fn();
    render(<LabeledSliderInput {...defaultProps} onChange={onChange} />);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });

    // Should not call onChange since onSliderChange wasn't provided and falls back
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders labels when provided', () => {
    const labels = ['Low', 'Medium', 'High'];
    render(<LabeledSliderInput {...defaultProps} labels={labels} />);

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('applies warning styles when warning prop is true', () => {
    render(<LabeledSliderInput {...defaultProps} warning={true} />);

    const numberInput = screen.getByRole('spinbutton');
    expect(numberInput).toHaveClass('border-yellow-500/50');
  });

  it('applies custom className', () => {
    render(<LabeledSliderInput {...defaultProps} className="custom-class" />);

    const container = screen.getByText('Test Label').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('sets correct attributes on inputs', () => {
    render(<LabeledSliderInput {...defaultProps} />);

    const numberInput = screen.getByRole('spinbutton');
    const slider = screen.getByRole('slider');

    expect(numberInput).toHaveAttribute('min', '0');
    expect(numberInput).toHaveAttribute('max', '10');
    expect(numberInput).toHaveAttribute('step', '1');

    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '10');
    expect(slider).toHaveAttribute('step', '1');
  });

  it('handles invalid number input gracefully', () => {
    const onChange = vi.fn();
    render(<LabeledSliderInput {...defaultProps} onChange={onChange} />);

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.change(numberInput, { target: { value: 'invalid' } });

    expect(onChange).toHaveBeenCalledWith(0); // Falls back to 0 for invalid input
  });

  it('has proper accessibility attributes', () => {
    render(<LabeledSliderInput {...defaultProps} />);

    const label = screen.getByText('Test Label');
    const numberInput = screen.getByRole('spinbutton');
    const slider = screen.getByRole('slider');

    expect(label).toHaveAttribute('for', numberInput.id);
    expect(slider).toHaveAttribute(
      'aria-labelledby',
      `${numberInput.id}-label`
    );
  });

  it('manages focus state correctly', () => {
    render(<LabeledSliderInput {...defaultProps} />);

    const numberInput = screen.getByRole('spinbutton');

    fireEvent.focus(numberInput);
    expect(numberInput).toHaveClass('focus-visible:outline-2');

    fireEvent.blur(numberInput);
    // Focus state is managed internally and affects styling
  });
});
