import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePaperDimensionInput } from '../use-paper-dimension-input';

/**
 * Characterization tests for the paper dimension input hook.
 *
 * The display string is shown in the *current unit* while the parent stores
 * inches, so these cover both the identity case (inches) and a converting case
 * (centimetres) to pin the round-trip.
 */

const INCHES = {
  toDisplay: (inches: number) => inches,
  toInches: (value: number) => value,
};

const CM = {
  toDisplay: (inches: number) => inches * 2.54,
  toInches: (cm: number) => cm / 2.54,
};

function setup(
  overrides: Partial<Parameters<typeof usePaperDimensionInput>[0]> = {}
) {
  const onWidthChange = vi.fn();
  const onHeightChange = vi.fn();

  const utils = renderHook(
    (props: { initialWidth: number; initialHeight: number }) =>
      usePaperDimensionInput({
        initialWidth: props.initialWidth,
        initialHeight: props.initialHeight,
        toDisplay: INCHES.toDisplay,
        toInches: INCHES.toInches,
        onWidthChange,
        onHeightChange,
        ...overrides,
      }),
    { initialProps: { initialWidth: 8, initialHeight: 10 } }
  );

  return { ...utils, onWidthChange, onHeightChange };
}

describe('usePaperDimensionInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds the inputs from the initial dimensions', () => {
    const { result } = setup();

    expect(result.current.paperWidthInput).toBe('8');
    expect(result.current.paperHeightInput).toBe('10');
    expect(result.current.isEditingPaperWidth).toBe(false);
    expect(result.current.isEditingPaperHeight).toBe(false);
  });

  it('renders the initial dimensions in display units', () => {
    const { result } = renderHook(() =>
      usePaperDimensionInput({
        initialWidth: 8,
        initialHeight: 10,
        toDisplay: CM.toDisplay,
        toInches: CM.toInches,
        onWidthChange: vi.fn(),
        onHeightChange: vi.fn(),
      })
    );

    expect(result.current.paperWidthInput).toBe('20.32');
    expect(result.current.paperHeightInput).toBe('25.4');
  });

  it('follows external dimension changes while not editing', () => {
    const { result, rerender } = setup();

    rerender({ initialWidth: 11, initialHeight: 14 });

    expect(result.current.paperWidthInput).toBe('11');
    expect(result.current.paperHeightInput).toBe('14');
  });

  it('does not clobber the typed value while editing', () => {
    const { result, rerender } = setup();

    act(() => result.current.handlePaperWidthChange('9.5'));
    // Parent echoes the pushed value back in.
    rerender({ initialWidth: 9.5, initialHeight: 10 });

    expect(result.current.paperWidthInput).toBe('9.5');
    expect(result.current.isEditingPaperWidth).toBe(true);
  });

  it('pushes valid keystrokes to the parent immediately', () => {
    const { result, onWidthChange } = setup();

    act(() => result.current.handlePaperWidthChange('9.5'));

    expect(onWidthChange).toHaveBeenCalledWith(9.5);
    expect(result.current.paperWidthInput).toBe('9.5');
  });

  it('converts to inches before pushing when a unit conversion is active', () => {
    const onWidthChange = vi.fn();
    const { result } = renderHook(() =>
      usePaperDimensionInput({
        initialWidth: 8,
        initialHeight: 10,
        toDisplay: CM.toDisplay,
        toInches: CM.toInches,
        onWidthChange,
        onHeightChange: vi.fn(),
      })
    );

    act(() => result.current.handlePaperWidthChange('25.4'));

    expect(onWidthChange).toHaveBeenCalledWith(10);
  });

  it.each([
    '',
    '   ',
    '12.',
  ])('keeps incomplete input %o visible without pushing it to the parent', (value) => {
    const { result, onWidthChange } = setup();

    act(() => result.current.handlePaperWidthChange(value));

    expect(result.current.paperWidthInput).toBe(value);
    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it('reformats to the canonical display value on blur', () => {
    const { result, onWidthChange, rerender } = setup();

    act(() => result.current.handlePaperWidthChange('9.5000'));
    rerender({ initialWidth: 9.5, initialHeight: 10 });
    act(() => result.current.handlePaperWidthBlur());

    expect(onWidthChange).toHaveBeenLastCalledWith(9.5);
    expect(result.current.paperWidthInput).toBe('9.5');
    expect(result.current.isEditingPaperWidth).toBe(false);
  });

  it.each([
    '',
    '  ',
    'abc',
  ])('reverts to the last committed dimension when blurring on %o', (value) => {
    const { result } = setup();

    act(() => result.current.handlePaperWidthChange(value));
    act(() => result.current.handlePaperWidthBlur());

    expect(result.current.paperWidthInput).toBe('8');
    expect(result.current.isEditingPaperWidth).toBe(false);
  });

  it('tracks height independently of width', () => {
    const { result, onHeightChange, onWidthChange } = setup();

    act(() => result.current.handlePaperHeightChange('14'));

    expect(onHeightChange).toHaveBeenCalledWith(14);
    expect(onWidthChange).not.toHaveBeenCalled();
    expect(result.current.paperHeightInput).toBe('14');
    expect(result.current.isEditingPaperHeight).toBe(true);
    expect(result.current.isEditingPaperWidth).toBe(false);
    expect(result.current.paperWidthInput).toBe('8');
  });

  it('reverts height to the last committed dimension on invalid blur', () => {
    const { result } = setup();

    act(() => result.current.handlePaperHeightChange('nope'));
    act(() => result.current.handlePaperHeightBlur());

    expect(result.current.paperHeightInput).toBe('10');
  });
});
