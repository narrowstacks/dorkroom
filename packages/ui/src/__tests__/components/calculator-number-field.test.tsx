import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CalculatorNumberField } from '../../components/calculator/calculator-number-field';

// Mirrors how a real TanStack Form field wires this component: the
// committed value flows back down as the `value` prop. A bare `vi.fn()`
// onChange spy (with a `value` prop fixed for the life of the test) can't
// model that round trip, which matters once a test asserts state *after*
// a commit (e.g. on blur).
function ControlledWrapper({
  initialValue,
  onChange,
  onBlur,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <CalculatorNumberField
      label="Width"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      onBlur={onBlur}
    />
  );
}

// Note: `<input type="number">` sanitizes its `.value` IDL attribute per the
// HTML spec - a genuinely unparseable string like "-" or "invalid" always
// reads back as "" (in every browser, and in jsdom), so onChange never even
// observes those raw characters. Real browsers additionally keep a separate
// internal "what the user is looking at" buffer that can still show the raw
// characters even though `.value` reads "" - jsdom has no such buffer, so
// tests for those fully-unparseable cases assert only what's observable:
// onChange is never called with a coerced 0. Strings that DO parse (like the
// still-in-progress "1.") are not sanitized away, so the draft-preservation
// behavior for those is directly testable end to end.
describe('CalculatorNumberField', () => {
  const defaultProps = {
    label: 'Width',
    value: '5',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label and current value', () => {
    render(<CalculatorNumberField {...defaultProps} />);

    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveDisplayValue('5');
  });

  it('never propagates onChange for a transitional "-", then commits once "-5" parses (never 0, never 5)', () => {
    const onChange = vi.fn();
    render(<CalculatorNumberField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '-' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '-5' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('-5');
    expect(input).toHaveDisplayValue('-5');
  });

  it('never propagates 0 for an empty draft', () => {
    const onChange = vi.fn();
    render(<CalculatorNumberField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveDisplayValue('');
  });

  it('keeps a trailing decimal point visible instead of snapping to a bare digit', () => {
    const onChange = vi.fn();
    render(<CalculatorNumberField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '1.' } });

    // "1." parses to a finite 1, so it commits as-is (no information lost),
    // and - because the draft (not a re-stringified committed number) drives
    // the visible value - the trailing dot stays visible instead of being
    // clobbered back to "1" mid-typing.
    expect(onChange).toHaveBeenCalledWith('1.');
    expect(input).toHaveDisplayValue('1.');

    fireEvent.change(input, { target: { value: '1.5' } });
    expect(onChange).toHaveBeenCalledWith('1.5');
    expect(input).toHaveDisplayValue('1.5');
  });

  it('reverts an unparseable draft to the last valid value on blur without calling onChange', () => {
    const onChange = vi.fn();
    render(<CalculatorNumberField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '-' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(input).toHaveDisplayValue('5'); // defaultProps.value, not 0
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a valid draft as-is on blur and calls onBlur', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(
      <ControlledWrapper initialValue="5" onChange={onChange} onBlur={onBlur} />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);

    expect(input).toHaveDisplayValue('12');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('renders an error message instead of helper text when provided', () => {
    render(
      <CalculatorNumberField
        {...defaultProps}
        helperText="Helper text"
        error="Must be at least 0.1"
      />
    );

    expect(screen.getByText('Must be at least 0.1')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('renders helper text when there is no error', () => {
    render(
      <CalculatorNumberField {...defaultProps} helperText="Helper text" />
    );

    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });
});
