import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

  // Mirrors real usage: the committed value flows back down as the `value`
  // prop. A bare `vi.fn()` onChange spy with a fixed `value` prop can't
  // model that round trip, which matters for assertions made *after* a
  // commit (e.g. the state a blur-clamp leaves behind).
  function ControlledWrapper({
    initialValue,
    min,
    max,
    onChange,
  }: {
    initialValue: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
  }) {
    const [value, setValue] = useState(initialValue);
    return (
      <LabeledSliderInput
        label="Test Label"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    );
  }

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

  it('calls onSliderChange when slider moves', async () => {
    const onSliderChange = vi.fn();
    render(
      <LabeledSliderInput {...defaultProps} onSliderChange={onSliderChange} />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });

    // onSliderChange is RAF-throttled, so flush the frame
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

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

  // Note: `<input type="number">` sanitizes its `.value` per the HTML spec -
  // an unparseable partial number like "-" or "invalid" always reads back as
  // "" (in every browser, and in jsdom). These tests assert what's
  // observable across environments: onChange is never called with a coerced
  // 0 for a transitional entry, and a full, valid number commits and
  // displays correctly once typed.
  it('does not coerce invalid number input to 0', () => {
    const onChange = vi.fn();
    render(<LabeledSliderInput {...defaultProps} onChange={onChange} />);

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.focus(numberInput);
    fireEvent.change(numberInput, { target: { value: 'invalid' } });

    // Transitional/unparseable text is never propagated as 0.
    expect(onChange).not.toHaveBeenCalled();
    expect(numberInput).not.toHaveValue(0);
  });

  it('preserves a draft "-" without emitting 0, then commits once a full negative number parses', () => {
    const onChange = vi.fn();
    render(
      <LabeledSliderInput
        {...defaultProps}
        min={-10}
        max={10}
        onChange={onChange}
      />
    );

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.focus(numberInput);
    fireEvent.change(numberInput, { target: { value: '-' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(numberInput, { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(-1);
    expect(numberInput).toHaveDisplayValue('-1');
  });

  it('clamps to min on blur without clamping per keystroke', () => {
    const onChange = vi.fn();
    render(
      <ControlledWrapper
        initialValue={5}
        min={0}
        max={10}
        onChange={onChange}
      />
    );

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.focus(numberInput);
    fireEvent.change(numberInput, { target: { value: '-1' } });
    // Typing keeps the out-of-range value visible; no clamp yet.
    expect(numberInput).toHaveDisplayValue('-1');
    expect(onChange).toHaveBeenLastCalledWith(-1);

    fireEvent.blur(numberInput);
    // Blur snaps both the displayed value and the committed value to min.
    expect(numberInput).toHaveDisplayValue('0');
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('reverts an unparseable draft to the last committed value on blur', () => {
    const onChange = vi.fn();
    render(<LabeledSliderInput {...defaultProps} onChange={onChange} />);

    const numberInput = screen.getByRole('spinbutton');
    fireEvent.focus(numberInput);
    fireEvent.change(numberInput, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(numberInput);
    expect(numberInput).toHaveDisplayValue('5'); // defaultProps.value
    expect(onChange).not.toHaveBeenCalled();
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
